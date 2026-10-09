# Dockerfile for ai-service (Python + FastAPI)
# Placeholder — image steps will be added later.
# Step 1: Python ki official lightweight image lena
FROM python:3.10-slim

# Step 2: Working Directory banana
WORKDIR /app

# Step 3: System dependencies install karna (agar kuch C libraries ki zaroorat ho)
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*

# Step 4: Python dependencies file copy karna
COPY requirements.txt .

# Step 5: Pip ke zariye python packages install karna
RUN pip install --no-cache-dir -r requirements.txt

# Step 6: Baaki saara AI source code copy karna
COPY . .

# Step 7: FastAPI ka default port (jaise 8000) expose karna
EXPOSE 8000

# Step 8: Uvicorn server ke zariye FastAPI app ko start karna
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]