"""In-process guard so one bot is not generated twice at the same time.

Per process only: a cost guard for the single-worker development server,
not a correctness guarantee across workers.
"""
import threading

_running: set[int] = set()
_mutex = threading.Lock()


def acquire(bot_id: int) -> bool:
    with _mutex:
        if bot_id in _running:
            return False
        _running.add(bot_id)
        return True


def release(bot_id: int) -> None:
    with _mutex:
        _running.discard(bot_id)


def is_running(bot_id: int) -> bool:
    with _mutex:
        return bot_id in _running
