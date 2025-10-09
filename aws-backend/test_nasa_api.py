import json
import urllib.request
import time

nasa_url = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=select+pl_name,hostname,sy_snum,sy_pnum,sy_dist,discoverymethod,disc_year,disc_facility,pl_orbper,pl_orbsmax,pl_rade,pl_bmasse,pl_dens,pl_eqt,pl_insol,st_teff,st_rad,st_mass,st_logg,st_age+from+ps&format=json"

print("Fetching data from NASA Exoplanet Archive...")
start = time.time()
with urllib.request.urlopen(nasa_url) as response:
    print("Connected! Downloading data...")
    raw_data = response.read()
    print(f"Downloaded {len(raw_data)} bytes in {time.time()-start:.2f}s")
    print("Parsing JSON...")
    data = json.loads(raw_data)
    print(f"Parsed successfully!")

print(f"\nTotal planets: {len(data)}")
print(f"Total time: {time.time()-start:.2f}s")
print(f"\nFirst planet sample:")
print(json.dumps(data[0], indent=2))
print(f"\nAll fields: {list(data[0].keys())}")
print(f"Last planet: {data[-1]['pl_name']}")
