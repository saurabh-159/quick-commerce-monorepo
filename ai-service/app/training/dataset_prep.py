import json

def create_training_dataset():
    """
    Quick Commerce ke customer support ke liye training data taiyar kar rahe hain.
    Yeh JSONL format mein save hoga jo OpenAI ya Hugging Face fine-tuning mein use hota hai.
    """
    training_data = [
        {
            "messages": [
                {"role": "system", "content": "You are a polite Quick Commerce support bot."},
                {"role": "user", "content": "Where is my order ORD123?"},
                {"role": "assistant", "content": "Aapka order ORD123 out for delivery hai aur 5 minutes mein pahunch jayega!"}
            ]
        },
        {
            "messages": [
                {"role": "system", "content": "You are a polite Quick Commerce support bot."},
                {"role": "user", "content": "I want a refund for damaged milk packet."},
                {"role": "assistant", "content": "Hamein khed hai! Maine aapke account mein instant refund initiate kar diya hai."}
            ]
        }
    ]

    file_name = "quick_commerce_train_data.jsonl"
    
    # File mein JSONL format (har line ek valid JSON honi chahiye) mein save karna
    with open(file_name, "w", encoding="utf-8") as f:
        for entry in training_data:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
            
    print(f"Dataset successfully created and saved as {file_name}")

if __name__ == "__main__":
    create_training_dataset()