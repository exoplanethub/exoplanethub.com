import json
import os
import urllib.request
import boto3
from decimal import Decimal
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])

def lambda_handler(event, context):
    nasa_url = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=select+pl_name,hostname,sy_snum,sy_pnum,sy_dist,discoverymethod,disc_year,disc_facility,pl_orbper,pl_orbsmax,pl_rade,pl_bmasse,pl_dens,pl_eqt,pl_insol,st_teff,st_rad,st_mass,st_logg,st_age+from+ps&format=json"
    
    with urllib.request.urlopen(nasa_url) as response:
        data = json.loads(response.read())
    
    existing_planets = get_existing_planets_with_timestamps()
    new_planets = []
    updated = 0
    timestamp = datetime.utcnow().isoformat()
    
    for planet in data:
        pl_name = planet['pl_name']
        is_new = pl_name not in existing_planets
        
        item = {
            'pl_name': pl_name,
            'hostname': planet.get('hostname'),
            'sy_snum': to_decimal(planet.get('sy_snum')),
            'sy_pnum': to_decimal(planet.get('sy_pnum')),
            'sy_dist': to_decimal(planet.get('sy_dist')),
            'discoverymethod': planet.get('discoverymethod'),
            'disc_year': to_decimal(planet.get('disc_year')),
            'disc_facility': planet.get('disc_facility'),
            'pl_orbper': to_decimal(planet.get('pl_orbper')),
            'pl_orbsmax': to_decimal(planet.get('pl_orbsmax')),
            'pl_rade': to_decimal(planet.get('pl_rade')),
            'pl_bmasse': to_decimal(planet.get('pl_bmasse')),
            'pl_dens': to_decimal(planet.get('pl_dens')),
            'pl_eqt': to_decimal(planet.get('pl_eqt')),
            'pl_insol': to_decimal(planet.get('pl_insol')),
            'st_teff': to_decimal(planet.get('st_teff')),
            'st_rad': to_decimal(planet.get('st_rad')),
            'st_mass': to_decimal(planet.get('st_mass')),
            'st_logg': to_decimal(planet.get('st_logg')),
            'st_age': to_decimal(planet.get('st_age')),
            'last_updated': timestamp
        }
        
        if is_new:
            item['added_to_table'] = timestamp
            new_planets.append(pl_name)
        else:
            item['added_to_table'] = existing_planets[pl_name]
        
        table.put_item(Item=item)
        updated += 1
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'total_synced': updated,
            'new_discoveries': len(new_planets),
            'new_planets': new_planets[:10] if new_planets else []
        })
    }

def get_existing_planets_with_timestamps():
    planets = {}
    response = table.scan(ProjectionExpression='pl_name,added_to_table')
    for item in response.get('Items', []):
        planets[item['pl_name']] = item.get('added_to_table')
    
    while 'LastEvaluatedKey' in response:
        response = table.scan(
            ProjectionExpression='pl_name,added_to_table',
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        for item in response.get('Items', []):
            planets[item['pl_name']] = item.get('added_to_table')
    
    return planets

def to_decimal(value):
    if value is None:
        return None
    return Decimal(str(value))
