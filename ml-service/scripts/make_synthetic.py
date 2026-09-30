import argparse
import json
import csv
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path
import numpy as np
from faker import Faker
import uuid

def clip(val, min_val, max_val):
    return max(min_val, min(max_val, val))

def generate_synthetic_data(deals_count, min_inter, max_inter, won_rate, out_path):
    fake = Faker()
    Faker.seed(42)
    random.seed(42)
    np.random.seed(42)
    
    out_file = Path(out_path)
    out_file.parent.mkdir(parents=True, exist_ok=True)
    
    labels_file = out_file.parent / "labels.csv"
    
    deals_data = []
    labels_data = []
    
    now = datetime.now(timezone.utc)
    
    for i in range(deals_count):
        deal_id = str(uuid.uuid4())
        
        # Determine outcome: is_won
        is_won = random.random() < won_rate
        is_closed = random.random() < 0.7  # 70% closed
        
        # In a CRM, active/snapshot stages are lead, qualified, proposal, negotiation.
        # Won deals predominantly reached proposal or negotiation.
        # Lost deals dropped out across lead, qualified, proposal, or negotiation.
        if is_won:
            stage_choices = ["qualified", "proposal", "negotiation", "won"]
            stage_weights = [0.10, 0.40, 0.40, 0.10]
        else:
            stage_choices = ["lead", "qualified", "proposal", "negotiation", "lost"]
            stage_weights = [0.35, 0.35, 0.15, 0.05, 0.10]
            
        stage = random.choices(stage_choices, weights=stage_weights)[0]
        
        # deal_value: lognormal (median 25k, tail to 250k)
        # log(25000) ~ 10.12, sigma ~ 1.0
        deal_value = float(np.round(np.random.lognormal(mean=10.12, sigma=0.8), 2))
        
        # created_at: uniform last 90d
        days_ago = random.uniform(0, 90)
        created_at = now - timedelta(days=days_ago)
        
        num_interactions = random.randint(min_inter, max_inter)
        
        interactions = []
        last_interaction_time = created_at
        
        for j in range(num_interactions):
            int_id = str(uuid.uuid4())
            int_type = random.choices(["email", "call", "meeting", "note"], weights=[0.5, 0.25, 0.15, 0.1])[0]
            
            # content from templates
            product = random.choice(["GTX Pro", "Enterprise Suite", "Cloud Storage", "Support Package"])
            contact = fake.first_name()
            templates = [
                f"Followed up on {product} pricing, {contact} asked about discount.",
                f"Had a call regarding {product}.",
                f"{contact} wants to see a demo.",
                f"Discussed implementation timeline.",
                f"Sent the proposal for {product}."
            ]
            content = random.choice(templates)
            
            if is_won:
                resp_min = clip(np.random.normal(140, 70), 15, 1440)
                sent = clip(np.random.normal(0.30, 0.30), -1, 1)
                # Most won deals have recent contact, but ~12% have procurement delays
                if random.random() < 0.12:
                    gap_days = random.uniform(7.0, 16.0)
                else:
                    gap_days = random.uniform(0.2, 5.5)
            else:
                resp_min = clip(np.random.normal(520, 220), 15, 2880)
                sent = clip(np.random.normal(-0.20, 0.30), -1, 1)
                # Most lost deals have stalled, but ~15% had a recent rejection/breakup interaction
                if random.random() < 0.15:
                    gap_days = random.uniform(0.5, 4.0)
                else:
                    gap_days = random.uniform(6.0, 24.0)
                
            int_time = last_interaction_time + timedelta(days=gap_days)
            if int_time > now:
                int_time = now - timedelta(hours=random.uniform(1, 24))
            
            last_interaction_time = int_time
            
            interactions.append({
                "id": int_id,
                "deal_id": deal_id,
                "type": int_type,
                "content": content,
                "sentiment_score": float(sent),
                "response_time_minutes": int(resp_min),
                "created_at": int_time.isoformat()
            })
            
        interactions.sort(key=lambda x: x["created_at"])
        
        # fix sentiment trend for won/lost
        if len(interactions) >= 2:
            if is_won and random.random() < 0.85:
                # trend positive: make last sentiment higher than first
                if interactions[-1]["sentiment_score"] < interactions[0]["sentiment_score"]:
                    interactions[-1]["sentiment_score"], interactions[0]["sentiment_score"] = interactions[0]["sentiment_score"], interactions[-1]["sentiment_score"]
            elif not is_won and random.random() < 0.85:
                # trend negative: make last sentiment lower than first
                if interactions[-1]["sentiment_score"] > interactions[0]["sentiment_score"]:
                    interactions[-1]["sentiment_score"], interactions[0]["sentiment_score"] = interactions[0]["sentiment_score"], interactions[-1]["sentiment_score"]

        closed_at = None
        if is_closed:
            closed_at = last_interaction_time + timedelta(days=random.uniform(1, 3))
            if closed_at > now:
                closed_at = now
            
        deal = {
            "id": deal_id,
            "stage": stage,
            "value": deal_value,
            "created_at": created_at.isoformat(),
            "closed_at": closed_at.isoformat() if closed_at else None,
            "interactions": interactions
        }
        
        deals_data.append(deal)
        
        labels_data.append({
            "deal_id": deal_id,
            "is_won": 1 if is_won else 0
        })
            
    # Write JSONL
    with open(out_file, "w") as f:
        for d in deals_data:
            f.write(json.dumps(d) + "\n")
            
    # Write CSV
    with open(labels_file, "w", newline='') as f:
        writer = csv.DictWriter(f, fieldnames=["deal_id", "is_won"])
        writer.writeheader()
        writer.writerows(labels_data)
        
    print(f"Generated {deals_count} deals to {out_file} and {labels_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--deals", type=int, default=200)
    parser.add_argument("--min-inter", type=int, default=3)
    parser.add_argument("--max-inter", type=int, default=15)
    parser.add_argument("--won-rate", type=float, default=0.55)
    parser.add_argument("--out", type=str, default="data/synthetic.json")
    args = parser.parse_args()
    
    generate_synthetic_data(args.deals, args.min_inter, args.max_inter, args.won_rate, args.out)
