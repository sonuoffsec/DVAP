from __future__ import annotations

import secrets
import uuid
from datetime import UTC, datetime
from pathlib import Path

import docker
import docker.errors
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.lab import InstanceStatus, Lab, LabInstance

_LABS_DIR = Path("/labs")
_PORT_RANGE_START = 8090
_PORT_RANGE_END = 8190
_INSTANCE_LABEL = "dvap.instance"

_client: docker.DockerClient | None = None


def _docker_client() -> docker.DockerClient:
    global _client
    if _client is None:
        _client = docker.DockerClient(base_url="unix:///var/run/docker.sock")
    return _client


def _image_name(lab_slug: str) -> str:
    return f"dvap-lab-{lab_slug}:latest"


def _container_name(session_token: str) -> str:
    return f"dvap-instance-{session_token[:12]}"


async def _find_available_port(client: docker.DockerClient) -> int:
    used: set[int] = set()
    for container in client.containers.list(filters={"label": _INSTANCE_LABEL}):
        for port_bindings in (container.ports or {}).values():
            if port_bindings:
                for binding in port_bindings:
                    used.add(int(binding["HostPort"]))

    for port in range(_PORT_RANGE_START, _PORT_RANGE_END):
        if port not in used:
            return port

    raise RuntimeError("No available ports for lab instance")


async def ensure_lab_image(lab_slug: str) -> str:
    client = _docker_client()
    image_tag = _image_name(lab_slug)
    lab_dir = _LABS_DIR / lab_slug

    if not lab_dir.exists():
        raise ValueError(f"Lab directory not found: {lab_dir}")

    try:
        client.images.get(image_tag)
        logger.info(f"Lab image {image_tag} already exists")
    except docker.errors.ImageNotFound:
        logger.info(f"Building lab image {image_tag}")
        client.images.build(
            path=str(lab_dir),
            tag=image_tag,
            rm=True,
            forcerm=True,
        )
        logger.info(f"Lab image {image_tag} built successfully")

    return image_tag


async def launch_instance(
    db: AsyncSession,
    lab: Lab,
    session_token: str,
) -> LabInstance:
    client = _docker_client()

    image_tag = await ensure_lab_image(lab.slug)
    port = await _find_available_port(client)

    container_name = _container_name(session_token)
    labs_network = settings.dvap_labs_network

    try:
        ollama_container = client.containers.get(settings.dvap_ollama_container)
        try:
            labs_net = client.networks.get(labs_network)
            try:
                labs_net.connect(ollama_container)
            except docker.errors.APIError:
                pass
        except docker.errors.NotFound:
            logger.warning(f"Labs network {labs_network} not found")
    except docker.errors.NotFound:
        logger.warning("Ollama container not found — lab will run without LLM")

    container = client.containers.run(
        image_tag,
        detach=True,
        name=container_name,
        network=labs_network,
        ports={"8000/tcp": port},
        environment={
            "OLLAMA_URL": f"http://{settings.dvap_ollama_container}:11434",
            "SESSION_TOKEN": session_token,
            "LAB_SLUG": lab.slug,
        },
        labels={
            _INSTANCE_LABEL: session_token,
            "dvap.lab": lab.slug,
        },
        mem_limit="512m",
        nano_cpus=500_000_000,
        read_only=False,
        remove=False,
    )

    instance = LabInstance(
        lab_id=lab.id,
        session_token=session_token,
        status=InstanceStatus.RUNNING,
        container_id=container.id,
        port_mappings={"app": port},
        started_at=datetime.now(UTC),
    )
    db.add(instance)
    await db.commit()
    await db.refresh(instance)

    logger.info(f"Launched lab instance {session_token[:12]} on port {port}")
    return instance


async def stop_instance(db: AsyncSession, instance: LabInstance) -> LabInstance:
    if instance.container_id:
        client = _docker_client()
        try:
            container = client.containers.get(instance.container_id)
            container.stop(timeout=10)
            container.remove(force=True)
            logger.info(f"Stopped container {instance.container_id[:12]}")
        except docker.errors.NotFound:
            pass
        except Exception as exc:
            logger.warning(f"Error stopping container: {exc}")

    instance.status = InstanceStatus.STOPPED
    instance.stopped_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(instance)
    return instance


async def reset_instance(db: AsyncSession, instance: LabInstance, lab: Lab) -> LabInstance:
    await stop_instance(db, instance)
    new_token = secrets.token_hex(32)
    return await launch_instance(db, lab, new_token)


async def get_active_instance(
    db: AsyncSession,
    lab_id: uuid.UUID,
    session_token: str,
) -> LabInstance | None:
    stmt = select(LabInstance).where(
        LabInstance.lab_id == lab_id,
        LabInstance.session_token == session_token,
        LabInstance.status == InstanceStatus.RUNNING,
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_container_logs(container_id: str, tail: int = 100) -> str:
    client = _docker_client()
    try:
        container = client.containers.get(container_id)
        return container.logs(tail=tail, timestamps=True).decode("utf-8", errors="replace")
    except docker.errors.NotFound:
        return ""
