import os
import json
from openai import OpenAI
from app.services.agent_tools import check_order_status

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def run_agent_with_tools(user_message: str):
    # Step 1: Batana ki hamare paas kaun-kaun se tools available hain
    tools = [
        {
            "type": "function",
            "function": {
                "name": "check_order_status",
                "description": "Check the delivery status of a quick commerce order using order id.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "order_id": {
                            "type": "string",
                            "description": "The order ID, e.g. ORD123",
                        }
                    },
                    "required": ["order_id"],
                },
            },
        }
    ]

    # Step 2: User ka message OpenAI ko bhejna sath mein tools ki list dekar
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": user_message}],
        tools=tools,
        tool_choice="auto", # AI khud decide karega ki tool use karna hai ya nahi
    )

    response_message = response.choices[0].message

    # Step 3: Check karna ki kya AI ne koi tool call karne ki maang ki hai?
    if response_message.tool_calls:
        tool_call = response_message.tool_calls[0]
        function_name = tool_call.function.name
        function_args = json.loads(tool_call.function.arguments)

        # Agar AI ne 'check_order_status' tool choose kiya hai
        if function_name == "check_order_status":
            # Hamara Python function run hoga aur real result laayega
            tool_result = check_order_status(order_id=function_args.get("order_id"))

            # Step 4: Tool ka result wapas OpenAI ko dena taaki wo user ko final English mein jawaab de sake
            second_response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "user", "content": user_message},
                    response_message,
                    {
                        "role": "tool",
                        "content": tool_result,
                        "tool_call_id": tool_call.id,
                    },
                ],
            )
            return second_response.choices[0].message.content

    # Agar tool ki zaroorat nahi padi, toh AI direct normal jawab dega
    return response_message.content


def run_shopping_agent(query: str) -> str:
    answer = run_agent_with_tools(query)
    return answer or "I could not complete that request."  