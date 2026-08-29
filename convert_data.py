import json
import pandas as pd

df = pd.read_csv("synthetic_health_data_with_precautions.csv")
dataset = []

for _, row in df.iterrows():
  prompt = f"Patient Info: Age {row['Age']}, Gender {row['Gender']}, BP {row['Systolic_BP']}/{row['Diastolic_BP']}, Fasting Sugar {row['Fasting_Blood_Sugar']} mg/dL, Heart: {row['Heart_Problem']}, Past Injuries: {row['Past_Injuries']}, Notes: {row['Exemptions_and_Anomalies']}."
  response = f"Danger Level: {row['Danger_Level']}\nPrecautions: {row['Precautions']}"

  dataset.append({
      "instruction": (
          "Analyze the patient vitals and provide danger level and"
          " precautions."
      ),
      "input": prompt,
      "output": response,
  })

with open("medical_training_data.jsonl", "w") as f:
  for item in dataset:
    f.write(json.dumps(item) + "\n")

print("Done! Created medical_training_data.jsonl")