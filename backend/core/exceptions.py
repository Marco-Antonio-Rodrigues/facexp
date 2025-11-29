from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    # Chama o handler padrão primeiro para obter a resposta padrão
    response = exception_handler(exc, context)

    if response is not None:
        # Modifica a mensagem de erro padrão "detail"
        if "detail" in response.data:
            response.data["message"] = response.data.pop("detail")

    return response
