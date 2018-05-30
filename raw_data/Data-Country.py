import pycountry
import pandas as pd

data = pd.read_csv("../data/countries_2017.csv", sep=",")

countries = {}
for country in pycountry.countries:
  countries[country.name] = country.alpha_3
  
country_3 = []
for cName in data["country"]:
  try:
    country_3.append(countries[cName])
  except:
    country_3.append("")

data["id"] = country_3;
data.to_csv('countries_2017.csv',sep=',')
