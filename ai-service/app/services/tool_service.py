import os
import json
from openai import OpenAI

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# 1. Mock Database / Stock function jo backend execute karega
def check_product_stock(product_name: str) -> str:
    from app.services.db_tools import get_live_product_stock_sync

    inventory = {
        "milk": "Yes, 45 packets of fresh milk are available in stock.",
        "shoes": "No, running shoes are currently out of stock.",
        "ice cream": "Yes, chocolate ice cream is available.",
    }
    try:
        live = get_live_product_stock_sync(product_name)
        if live and not live.startswith("Database error"):
            return json.dumps({"stock_info": live})
    except Exception as e:
        print(f"Live stock lookup failed: {e}")

    result = inventory.get(product_name.lower(), "Product not found in inventory.")
    return json.dumps({"stock_info": result})
def run_tool_assisted_chat(user_message: str):
    # 2. Tools ki list define karna jo OpenAI ko batayenge ki hamare paas yeh functions hain
    tools = [
            {
                "type": "function",
                "function": {
                    "name": "check_product_stock",
                    "description": "Check the real-time stock availability of a product in the store.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "product_name": {
                                "type": "string",
                                "description": "The name of the product, e.g., milk, shoes"
                            }
                        },
                        "required": ["product_name"]
                    }
                }
            }
        ]

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": user_message}],
            tools=tools,
            tool_choice="auto" # LLM khud decide karega ki tool call karna hai ya nahi
        )

        response_message = response.choices[0].message
        
        # Check karo kya LLM ne koi tool call karne ko bola hai?
        if response_message.tool_calls:
            tool_call = response_message.tool_calls[0]
            function_name = tool_call.function.name
            function_args = json.loads(tool_call.function.arguments)

            # Agar LLM ne 'check_product_stock' maanga hai toh Python function run karo
            if function_name == "check_product_stock":
                tool_output = check_product_stock(function_args.get("product_name"))
                return {
                    "tool_called": function_name,
                    "arguments": function_args,
                    "tool_output": json.loads(tool_output)
                }
        
        return {"response": response_message.content}
    except Exception as e:
        print(f"⚠️ Tool Calling Error: {str(e)}")
        return {"error": str(e)}