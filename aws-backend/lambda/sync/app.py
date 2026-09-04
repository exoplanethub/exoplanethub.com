import json
import logging
import os
import urllib.request
import boto3
from datetime import datetime
from esi import compute_esi
from records import update_records_after_sweep
from sweep import sweep_removed
from values import to_decimal

logging.getLogger('sweep').setLevel(logging.INFO)
logging.getLogger('records').setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])
tombstones = dynamodb.Table(os.environ['TOMBSTONES_TABLE_NAME'])
records_table = dynamodb.Table(os.environ['RECORDS_TABLE_NAME'])

def lambda_handler(event, context):
    nasa_url = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=select+pl_name,hostname,sy_snum,sy_pnum,sy_dist,discoverymethod,disc_year,disc_facility,pl_orbper,pl_orbsmax,pl_rade,pl_bmasse,pl_dens,pl_eqt,pl_insol,st_teff,st_rad,st_mass,st_logg,st_age+from+ps+where+default_flag=1&format=json"
    
    with urllib.request.urlopen(nasa_url) as response:
        data = json.loads(response.read())
    
    timestamp = datetime.utcnow().isoformat()
    archive_names = {planet['pl_name'] for planet in data}

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

            score = compute_esi(planet)
            if score is not None:
                item['esi'] = score

            batch.put_item(Item=item)

    sweep = sweep_removed(table, tombstones, archive_names, removed_at=timestamp)
    records = update_records_after_sweep(sweep, records_table, data, timestamp)

    return {
        'statusCode': 200,
        'body': json.dumps({
            'total_synced': len(data),
            'removals_submitted': len(sweep.submitted),
            'sweep_aborted': sweep.aborted,
            'records_changed': len(records.changed),
            'records_aborted': records.aborted
        })
    }
