from __future__ import annotations

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.lab import InstanceStatus, Lab, LabInstance
from app.services import instance_service


def _make_lab(slug: str = "prompt-injection") -> Lab:
    lab = Lab(
        slug=slug,
        name="Prompt Injection",
        description="Test lab.",
        category="prompt_injection",
        difficulty="beginner",
    )
    return lab


def _mock_docker(port: int = 8090, container_id: str = "abc123deadbeef"):
    mock_client = MagicMock()

    mock_container = MagicMock()
    mock_container.id = container_id
    mock_container.ports = {"8000/tcp": [{"HostPort": str(port)}]}

    mock_client.containers.list.return_value = []
    mock_client.containers.run.return_value = mock_container
    mock_client.containers.get.return_value = mock_container
    mock_client.images.get.return_value = MagicMock()
    mock_client.networks.get.return_value = MagicMock()

    return mock_client


@pytest.mark.asyncio
async def test_launch_instance_creates_db_record(db):
    lab = _make_lab()
    db.add(lab)
    await db.commit()

    mock_client = _mock_docker()
    with (
        patch("app.services.instance_service._docker_client", return_value=mock_client),
        patch("app.services.instance_service._LABS_DIR") as mock_dir,
    ):
        mock_dir.__truediv__ = lambda self, other: MagicMock(exists=lambda: True)

        token = "a" * 64
        instance = await instance_service.launch_instance(db, lab, token)

    assert instance.id is not None
    assert instance.lab_id == lab.id
    assert instance.session_token == token
    assert instance.status == InstanceStatus.RUNNING
    assert instance.started_at is not None
    assert isinstance(instance.started_at, datetime)
    assert instance.stopped_at is None


@pytest.mark.asyncio
async def test_stop_instance_sets_stopped_state(db):
    lab = _make_lab()
    db.add(lab)
    await db.flush()

    instance = LabInstance(
        lab_id=lab.id,
        session_token="b" * 64,
        status=InstanceStatus.RUNNING,
        container_id="deadbeef123456",
        port_mappings={"app": 8091},
        started_at=datetime.now(UTC),
    )
    db.add(instance)
    await db.commit()

    mock_client = _mock_docker()
    with patch("app.services.instance_service._docker_client", return_value=mock_client):
        stopped = await instance_service.stop_instance(db, instance)

    assert stopped.status == InstanceStatus.STOPPED
    assert stopped.stopped_at is not None
    assert isinstance(stopped.stopped_at, datetime)
    mock_client.containers.get.assert_called_once_with("deadbeef123456")


@pytest.mark.asyncio
async def test_stop_instance_handles_missing_container(db):
    import docker.errors

    lab = _make_lab()
    db.add(lab)
    await db.flush()

    instance = LabInstance(
        lab_id=lab.id,
        session_token="c" * 64,
        status=InstanceStatus.RUNNING,
        container_id="gone_container",
        port_mappings={"app": 8092},
        started_at=datetime.now(UTC),
    )
    db.add(instance)
    await db.commit()

    mock_client = MagicMock()
    mock_client.containers.get.side_effect = docker.errors.NotFound("gone")

    with patch("app.services.instance_service._docker_client", return_value=mock_client):
        stopped = await instance_service.stop_instance(db, instance)

    assert stopped.status == InstanceStatus.STOPPED


@pytest.mark.asyncio
async def test_get_active_instance_running(db):
    lab = _make_lab()
    db.add(lab)
    await db.flush()

    token = "d" * 64
    instance = LabInstance(
        lab_id=lab.id,
        session_token=token,
        status=InstanceStatus.RUNNING,
        port_mappings={"app": 8093},
        started_at=datetime.now(UTC),
    )
    db.add(instance)
    await db.commit()

    found = await instance_service.get_active_instance(db, lab.id, token)
    assert found is not None
    assert found.id == instance.id


@pytest.mark.asyncio
async def test_get_active_instance_stopped_returns_none(db):
    lab = _make_lab()
    db.add(lab)
    await db.flush()

    token = "e" * 64
    instance = LabInstance(
        lab_id=lab.id,
        session_token=token,
        status=InstanceStatus.STOPPED,
        port_mappings={"app": 8094},
        started_at=datetime.now(UTC),
        stopped_at=datetime.now(UTC),
    )
    db.add(instance)
    await db.commit()

    found = await instance_service.get_active_instance(db, lab.id, token)
    assert found is None


@pytest.mark.asyncio
async def test_get_active_instance_wrong_token(db):
    lab = _make_lab()
    db.add(lab)
    await db.flush()

    instance = LabInstance(
        lab_id=lab.id,
        session_token="f" * 64,
        status=InstanceStatus.RUNNING,
        port_mappings={"app": 8095},
        started_at=datetime.now(UTC),
    )
    db.add(instance)
    await db.commit()

    found = await instance_service.get_active_instance(db, lab.id, "g" * 64)
    assert found is None
