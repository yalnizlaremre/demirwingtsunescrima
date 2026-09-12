from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request


def get_real_client_ip(request: Request) -> str:
    """Uygulama sadece Caddy reverse proxy arkasinda calisiyor (backend disariya
    acik degil, bkz. docker-compose.yml `expose` vs `ports`), bu yuzden Caddy'nin
    ekledigi X-Forwarded-For'daki SON deger guvenilir gercek istemci IP'sidir.
    Ilk degeri almak istemcinin kendi gonderdigi (sahte olabilecek) bir deger
    olabileceginden guvenli degildir."""
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[-1].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=get_real_client_ip)
