import os
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

def run_langchain_shopping_query(category: str, item: str) -> str:
    # 1. OpenAI model wrap kiya LangChain ke sath
    llm = ChatOpenAI(
        model="gpt-3.5-turbo",
        temperature=0.7,
        api_key=os.environ.get("OPENAI_API_KEY")
    )

    # 2. Reusable Prompt Template banaya (Express templates jaisa)
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert assistant for a quick-commerce grocery app."),
        ("user", "Suggest the best {category} item for someone looking for {item}. Give a 1-line catchy description.")
    ])

    # 3. Output parser jo direct string return karega
    output_parser = StrOutputParser()

    # 4. LangChain Expression Language (LCEL) pipe operator (|) se chain jodi
    chain = prompt | llm | output_parser

    # 5. Chain ko run kiya arguments pass karke
    try:
        response = chain.invoke({"category": category, "item": item})
        return response
    except Exception as e:
        print(f"⚠️ LangChain Error: {str(e)}")
        return "Sorry, I could not generate a recommendation right now."