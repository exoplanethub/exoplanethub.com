import json
import os
import urllib.request
import boto3
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])

def lambda_handler(event, context):
    nasa_url = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=select+pl_name,hostname,sy_snum,sy_pnum,discoverymethod,disc_year,pl_orbper,pl_rade,pl_bmasse,pl_eqt,pl_insol,st_teff,st_rad,st_mass+from+ps+where+default_flag=1&format=json"
    
    with urllib.request.urlopen(nasa_url) as response:
        data = json.loads(response.read())
    
    processed = 0
    for planet in data:
        score = calculate_habitability(planet)
        
        item = {
            'pl_name': planet['pl_name'],
            'hostname': planet.get('hostname'),
            'sy_snum': to_decimal(planet.get('sy_snum')),
            'sy_pnum': to_decimal(planet.get('sy_pnum')),
            'discoverymethod': planet.get('discoverymethod'),
            'disc_year': to_decimal(planet.get('disc_year')),
            'pl_orbper': to_decimal(planet.get('pl_orbper')),
            'pl_rade': to_decimal(planet.get('pl_rade')),
            'pl_bmasse': to_decimal(planet.get('pl_bmasse')),
            'pl_eqt': to_decimal(planet.get('pl_eqt')),
            'pl_insol': to_decimal(planet.get('pl_insol')),
            'st_teff': to_decimal(planet.get('st_teff')),
            'st_rad': to_decimal(planet.get('st_rad')),
            'st_mass': to_decimal(planet.get('st_mass')),
            'habitability_score': Decimal(str(score))
        }
        
        table.put_item(Item=item)
        processed += 1
    
    return {
        'statusCode': 200,
        'body': json.dumps(f'Synced {processed} exoplanets')
    }

def calculate_habitability(planet):
    score = 0
    
    temp = planet.get('pl_eqt')
    if temp and 200 <= temp <= 350:
        score += 30
    elif temp and 150 <= temp <= 400:
        score += 15
    
    radius = planet.get('pl_rade')
    if radius and 0.5 <= radius <= 2.0:
        score += 25
    elif radius and 0.3 <= radius <= 3.0:
        score += 10
    
    mass = planet.get('pl_bmasse')
    if mass and 0.5 <= mass <= 5.0:
        score += 20
    elif mass and 0.1 <= mass <= 10.0:
        score += 10
    
    insolation = planet.get('pl_insol')
    if insolation and 0.25 <= insolation <= 4.0:
        score += 15
    elif insolation and 0.1 <= insolation <= 10.0:
        score += 5
    
    star_temp = planet.get('st_teff')
    if star_temp and 4000 <= star_temp <= 7000:
        score += 10
    
    return score

def to_decimal(value):
    if value is None:
        return None
    return Decimal(str(value))
