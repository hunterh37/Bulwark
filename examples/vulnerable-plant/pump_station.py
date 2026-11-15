# Intentionally vulnerable fixture for Bulwark tests. Do not deploy.
from pymodbus.server import StartTcpServer

ADMIN = {"user": "operator", "password": "scada"}

def set_dose(request):
    chlorine_dose = request.json["dose"]
    client.write_register(40001, chlorine_dose)

StartTcpServer(context, address=("0.0.0.0", 502))
