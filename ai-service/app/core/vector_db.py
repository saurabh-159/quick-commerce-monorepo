import chromadb

# 1. Local folder path set kar rahe hain jahan database save hoga (Jaise SQLite/MongoDB file)
chroma_client = chromadb.PersistentClient(path="./chroma_db")

# 2. Ek collection (matlab ek data table ya box) bana rahe hain jahan data store hoga
collection = chroma_client.get_or_create_collection(name="quick_commerce_docs")

def get_vector_collection():
    return collection