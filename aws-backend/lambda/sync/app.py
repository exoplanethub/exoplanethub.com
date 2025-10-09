import json
import os
import urllib.request
import boto3
from decimal import Decimal
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])

def lambda_handler(event, context):
    nasa_url = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=select+pl_name,hostname,sy_snum,sy_pnum,sy_dist,discoverymethod,disc_year,disc_facility,pl_orbper,pl_orbsmax,pl_rade,pl_bmasse,pl_dens,pl_eqt,pl_insol,st_teff,st_rad,st_mass,st_logg,st_age+from+ps+where+default_flag=1&format=json"
    
    with urllib.request.urlopen(nasa_url) as response:
        data = json.loads(response.read())
    
    timestamp = datetime.utcnow().isoformat()
    
    with table.batch_writer() as batch:
        for planet in data:
            item = {
                'pl_name': planet['pl_name'],
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
            
            batch.put_item(Item=item)
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'total_synced': len(data)
        })
    }

def to_decimal(value):
    if value is None:
        return None
    return Decimal(str(value))
