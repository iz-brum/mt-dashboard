import unittest
from apis.ana.hidrowebAuth import HidroWebAPI

class TestHidroWebAPI(unittest.TestCase):
    
    def test_authenticate(self):
        """Teste para autenticação e obtenção do token"""
        try:
            auth = HidroWebAPI()  # Inicializa a classe com as credenciais
            token = auth.authenticate()  # Chama o método de autenticação
            self.assertIsNotNone(token)  # Verifica se o token foi obtido corretamente
            print(f"Token de autenticação obtido com sucesso. Token truncado: {token[:10]}...")
        except Exception as e:
            self.fail(f"Erro ao autenticar: {e}")  # Caso ocorra erro, falha no teste

if __name__ == "__main__":
    unittest.main()


# To run the test, use the following command:   
# PYTHONPATH=./server python -m unittest server.apis.ana.tests.test_auth
