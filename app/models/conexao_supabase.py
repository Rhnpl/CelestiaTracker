from dotenv import load_dotenv
import os
from supabase import create_client, Client

# Carrega as variáveis do arquivo .env
load_dotenv()

# Conecta ao Supabase
url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(url, key)

print(" Conexão com o Supabase criada com sucesso!")

# Define o nome da tabela que você quer consultar
tabela = 'iss_positions'

# Faz a consulta
try:
    response = supabase.table("iss_positions").select("*").execute()

    # Importa o pandas
    import pandas as pd

    # Cria um DataFrame com os dados da tabela
    df = pd.DataFrame(response.data)

    print("\n Conexão com o Supabase criada com sucesso!")
    print("\n Dados retornados da tabela iss_positions:\n")
    print(df)

except Exception as e:
    print("\n Erro ao consultar tabela:")
    print(e)

df.to_csv("dados_iss.csv", index=False, encoding="utf-8")
print("\n Dados salvos em 'dados_iss.csv'")

