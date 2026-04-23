import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { UpdateCommand, GetCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sqsClient = new SQSClient({});

export const handler = async (event) => {
    for (const record of event.Records) {
        const { traceId } = JSON.parse(record.body);
        
        try {
            
            const { Item } = await docClient.send(new GetCommand({
                TableName: process.env.DYNAMODB_TABLE,
                Key: { traceId }
            }));

            if (!Item) throw new Error("No se encontró el registro del pago");

            
            await new Promise(resolve => setTimeout(resolve, 5000));

           
            const balanceOk = parseFloat(Item.amount) < 10000; 

            if (!balanceOk) {
                throw new Error("Fondos insuficientes en la tarjeta");
            }

            
            await docClient.send(new UpdateCommand({
                TableName: process.env.DYNAMODB_TABLE,
                Key: { traceId },
                UpdateExpression: "set #s = :s",
                ExpressionAttributeNames: { "#s": "status" },
                ExpressionAttributeValues: { ":s": "IN_PROGRESS" }
            }));

            
            await sqsClient.send(new SendMessageCommand({
                QueueUrl: process.env.SQS_TRANSACTION_URL,
                MessageBody: JSON.stringify({ traceId })
            }));

            console.log(`[OK] Pago ${traceId} validado y enviado a la cola de transacciones.`);

        } catch (error) {
            console.error(`[ERROR] Fallo en validación: ${error.message}`);

            
            await docClient.send(new UpdateCommand({
                TableName: process.env.DYNAMODB_TABLE,
                Key: { traceId },
                UpdateExpression: "set #s = :s, #e = :err",
                ExpressionAttributeNames: { 
                    "#s": "status",
                    "#e": "error" 
                },
                ExpressionAttributeValues: { 
                    ":s": "FAILED",
                    ":err": error.message
                }
            }));
        }
    }
};