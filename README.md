# Microservicio de Pagos (Payment API)

Este repositorio contiene el punto de entrada de transacciones del sistema. Actúa como el primer componente de la coreografía de pagos asíncronos, diseñado para absorber picos de tráfico sin saturar la base de datos de procesamiento.

## 🚀 Arquitectura y Tecnologías
* **Runtime:** Node.js (AWS Lambda).
* **Exposición:** Amazon API Gateway (Endpoint RESTful).
* **Mensajería:** Amazon SQS (Simple Queue Service) usando `@aws-sdk/client-sqs`.

## ⚙️ Flujo de Procesamiento

Este servicio implementa un patrón de **Desacoplamiento por Eventos**:
1. **Recepción HTTP:** La Lambda es invocada síncronamente vía API Gateway con el payload del usuario (producto, monto, datos del cliente).
2. **Generación de Traza:** Genera un identificador único (`traceId`) para el seguimiento transversal de la transacción en todo el sistema distribuido.
3. **Encolamiento Seguro:** Utiliza un **VPC Endpoint** configurado para enviar el objeto de la transacción a una cola de SQS (`payment-validation-queue`). Esto asegura que los datos viajen por la red privada de AWS, maximizando la seguridad.
4. **Respuesta Temprana:** Una vez el mensaje está seguro en la cola, la Lambda responde inmediatamente al frontend con el `traceId` para que este inicie el monitoreo visual (polling), liberando el recurso de cómputo.


## 🛡️ Seguridad y Red
La Lambda se ejecuta dentro de subredes privadas en la VPC y posee un rol de IAM (Execution Role) con políticas de mínimo privilegio, permitiéndole exclusivamente la acción `sqs:SendMessage` sobre el ARN de la cola correspondiente.
