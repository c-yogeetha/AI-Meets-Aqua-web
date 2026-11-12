import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.clock import now
from app.db import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class Tank(Base):
    __tablename__ = "tanks"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(60), nullable=False)
    volume_l = Column(Float, nullable=False)
    goldfish_count = Column(Integer, nullable=False)
    water_temp_c = Column(Float, nullable=True)
    owner_id = Column(String(64), nullable=False, default="legacy", index=True)
    created_at = Column(DateTime(timezone=True), default=now, nullable=False)

    videos = relationship("Video", back_populates="tank", cascade="all, delete-orphan")
    jobs = relationship("Job", back_populates="tank", cascade="all, delete-orphan")
    results = relationship("Result", back_populates="tank", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="tank", cascade="all, delete-orphan")


class Video(Base):
    __tablename__ = "videos"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    tank_id = Column(String(36), ForeignKey("tanks.id", ondelete="CASCADE"), nullable=False)
    original_name = Column(String(120), nullable=False)
    stored_path = Column(String(255), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    duration_s = Column(Float, nullable=False)
    fps = Column(Float, nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    view = Column(String(20), nullable=False, default="side")
    water_temp_c = Column(Float, nullable=True)
    last_water_change_days = Column(Integer, nullable=True)
    last_fed_hours = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=now, nullable=False)

    tank = relationship("Tank", back_populates="videos")
    jobs = relationship("Job", back_populates="video", cascade="all, delete-orphan")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    video_id = Column(String(36), ForeignKey("videos.id", ondelete="CASCADE"), nullable=False)
    tank_id = Column(String(36), ForeignKey("tanks.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), nullable=False, default="queued")  # queued | processing | done | failed
    stage = Column(String(20), nullable=False, default="queued")   # queued | cleaning | detecting | tracking | analysing | rendering | done
    progress = Column(Integer, nullable=False, default=0)
    error = Column(Text, nullable=True)
    analyzer = Column(String(20), nullable=False, default="baseline")
    created_at = Column(DateTime(timezone=True), default=now, nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)

    video = relationship("Video", back_populates="jobs")
    tank = relationship("Tank", back_populates="jobs")
    result = relationship("Result", back_populates="job", uselist=False, cascade="all, delete-orphan")


class Result(Base):
    __tablename__ = "results"

    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), primary_key=True)
    tank_id = Column(String(36), ForeignKey("tanks.id", ondelete="CASCADE"), nullable=False)
    mode = Column(String(20), nullable=False, default="baseline")  # baseline | mock | external
    result_json = Column(Text, nullable=False)
    tank_score = Column(Integer, nullable=False)
    level = Column(String(20), nullable=False)  # Normal | Moderate | High
    stressed_count = Column(Integer, nullable=False, default=0)
    fish_count = Column(Integer, nullable=False, default=0)
    duration_s = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime(timezone=True), default=now, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)  # Soft delete recycle bin

    job = relationship("Job", back_populates="result")
    tank = relationship("Tank", back_populates="results")
    alerts = relationship("Alert", back_populates="result", cascade="all, delete-orphan")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    tank_id = Column(String(36), ForeignKey("tanks.id", ondelete="CASCADE"), nullable=False)
    result_id = Column(String(36), ForeignKey("results.job_id", ondelete="CASCADE"), nullable=True)
    severity = Column(String(20), nullable=False)  # info | warning | critical
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now, nullable=False)
    read = Column(Boolean, default=False, nullable=False)

    tank = relationship("Tank", back_populates="alerts")
    result = relationship("Result", back_populates="alerts")


class AlertSettings(Base):
    __tablename__ = "alert_settings"

    id = Column(Integer, primary_key=True, default=1)
    dashboard_popup = Column(Boolean, default=True, nullable=False)
    email_enabled = Column(Boolean, default=False, nullable=False)
    email_to = Column(String(120), nullable=True)
