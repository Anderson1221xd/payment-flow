import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import crypto from "crypto";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const sqsClient = new SQSClient({ 
    endpoint: "https://vpce-0919d389a226b96d3-0mgdumko.sqs.us-east-1.vpce.amazonaws.com" 
});

export const handler = async (event) => {
    try {
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event;
        
      
        const productId = body.productId || body.service || "Sin ID"; 
        const amount = body.amount || 0;

        const traceId = crypto.randomUUID();
        const userId = "user-anderson-123"; 

        
        const paymentItem = {
            traceId: traceId,
            userId: body.userId || "user-anderson-123",
            productId: productId, 
            amount: amount,       
            status: "INITIAL",
            timestamp: Date.now().toString(),
            
           
            cardId: body.cardId || "Sin Tarjeta",      
            service: body.service || {} 
        };

       
        await docClient.send(new PutCommand({
            TableName: process.env.DYNAMODB_TABLE,
            Item: paymentItem
        }));

        //. ENVIAR A SQS
        await sqsClient.send(new SendMessageCommand({
            QueueUrl: process.env.SQS_VALIDATION_URL,
            MessageBody: JSON.stringify({ traceId: traceId })
        }));

        console.log(`[OK] Pago registrado: ${productId} por $${amount}`);

        return {
            statusCode: 200,
            headers: { 
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify({ traceId: traceId })
        };
    } catch (error) {
        console.error("[ERROR]", error);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: error.message })
        };
    }
};