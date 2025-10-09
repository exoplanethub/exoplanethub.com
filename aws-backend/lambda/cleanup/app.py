import json
import boto3

dynamodb = boto3.resource('dynamodb')

def lambda_handler(event, context):
    table_name = event.get('table_name')
    
    if not table_name:
        return {
            'statusCode': 400,
            'body': json.dumps('Missing table_name parameter')
        }
    
    table = dynamodb.Table(table_name)
    
    response = table.scan()
    items = response['Items']
    
    while 'LastEvaluatedKey' in response:
        response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
        items.extend(response['Items'])
    
    with table.batch_writer() as batch:
        for item in items:
            batch.delete_item(Key={'pl_name': item['pl_name']})
    
    return {
        'statusCode': 200,
        'body': json.dumps(f'Deleted {len(items)} items from {table_name}')
    }
