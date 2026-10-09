import os
import json
from openai import OpenAI

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# Mock Database for User Orders
MOCK_USER_ORDERS = {
    "user_123": {"order_id": "ORD9988", "item": "Tata Salt 1kg", "status": "Out for delivery, arriving in 8 minutes."},
    "user_456": {"order_id": "ORD7766", "item": "Fresh Milk", "status": "Packed and ready for dispatch."}
}

# 1. Tool Function: Live Order Status Fetch karne ke liye
def get_live_order_status(user_id: str) -> str:
    order = MOCK_USER_ORDERS.get(user_id)
    if not order:
        return json.dumps({"error": "No active order found for this user."})
    return json.dumps(order)

def handle_order_support(user_id: str, query: str) -> str:
    # Store Policies (FAQ Context)
    faq_context = (
        "Store Support Policies:\n"
        "- Refund Policy: Refunds are processed within 2-3 business days to the original payment source.\n"
        "- Cancellation Policy: Orders can be cancelled within 60 seconds of placement without any fee.\n"
        "- Delivery Timings: Standard quick delivery takes 10 to 15 minutes."
    )

    # Tool definition for OpenAI
    tools = [
        {
            "type": "function",
            "function": {
                "name": "get_live_order_status",
                "description": "Fetch the live delivery status of the user's current active order.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            }
        }
    ]

    system_prompt = (
        "You are an expert customer support AI for a quick-commerce app. "
        "Use the provided store policies for answering general questions. "
        "If the user asks about their order status, delivery time, or where their items are, "
        "you MUST call the 'get_live_order_status' tool to get the real status."
    )

    messages = [
        {"role": "system", "content": f"{system_prompt}\n\n{faq_context}"},
        {"role": "user", "content": query}
    ]

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo-0613",
            messages=messages,
            tools=tools,
            tool_choice="auto"
        )

        response_message = response.choices[0].message

        # Check if LLM decided to call the order status tool
        if response_message.tool_calls:
            tool_call = response_message.tool_calls[0]
            if tool_call.function.name == "get_live_order_status":
                # Execute tool using user_id context
                tool_output = get_live_order_status(user_id)
                
                # Send tool output back to LLM for final natural response
                messages.append(response_message)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "name": "get_live_order_status",
                    "content": tool_output
                })

                second_response = client.chat.completions.create(
                    model="gpt-3.5-turbo-0613",
                    messages=messages
                )
                return second_response.choices[0].message.content.strip()

        return response_message.content.strip()

    except Exception as e:
        print(f"⚠️ Support AI Error: {str(e)}")
        return "Sorry, I am facing some technical difficulties right now. Please try again later."