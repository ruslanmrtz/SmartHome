from sqlalchemy import create_engine, Column, Integer, String, JSON, select
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# База данных SQLite
DATABASE_URL = "sqlite:///scenarios.db"

engine = create_engine(DATABASE_URL, echo=False, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


# Модель сценария
class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    actions = Column(JSON, nullable=False)  # {"curtains": "open", "lights": "on", ...}


# Создание таблиц
Base.metadata.create_all(bind=engine)


# Функции для работы с базой
def add_scenario(name: str, actions: dict):
    """Добавить новый сценарий"""
    session = SessionLocal()
    try:
        scenario = Scenario(name=name, actions=actions)
        session.add(scenario)
        session.commit()
        session.refresh(scenario)
        return scenario
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()


def get_all_scenarios():
    """Получить все сценарии"""
    session = SessionLocal()
    try:
        scenarios = session.execute(select(Scenario)).scalars().all()
        return scenarios
    finally:
        session.close()


def get_scenario_by_name(name: str):
    """Получить сценарий по названию"""
    session = SessionLocal()
    try:
        scenario = session.execute(
            select(Scenario).where(Scenario.name == name)
        ).scalar_one_or_none()
        return scenario
    finally:
        session.close()
