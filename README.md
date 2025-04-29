# AgentCV - Analisador de Compatibilidade de Currículos

Este projeto contém uma aplicação serverless AWS que analisa a compatibilidade entre currículos de candidatos e vagas de emprego disponíveis. A aplicação utiliza AWS Lambda, Amazon DynamoDB e Amazon Bedrock com modelos da Anthropic para realizar análises inteligentes.

## Arquitetura da Solução

A aplicação possui os seguintes componentes:

- **API Gateway**: Recebe requisições com dados do candidato (CV e nome)
- **Lambda Function**: Processa os dados do candidato e realiza a análise
- **DynamoDB**: Armazena informações sobre vagas disponíveis
- **AWS Bedrock**: Utiliza o modelo Claude da Anthropic para analisar a compatibilidade entre o candidato e as vagas

## Estrutura do Projeto

- `agentcv/` - Código da função Lambda
  - `app.mjs` - Código principal da função Lambda
  - `package.json` - Dependências do projeto
- `template.yaml` - Template SAM que define os recursos AWS da aplicação
- `samconfig.toml` - Configuração do SAM CLI

## Pré-requisitos

Para implantar e executar esta aplicação, você precisará:

- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
- [Node.js 20](https://nodejs.org/en/) ou superior
- [Docker](https://hub.docker.com/search/?type=edition&offering=community) (para desenvolvimento local)
- Uma conta AWS com acesso ao DynamoDB e AWS Bedrock

## Deploy da Aplicação

Para implantar a aplicação pela primeira vez:

```bash
# Construir a aplicação
sam build

# Implantar a aplicação (com wizard interativo)
sam deploy --guided
```

Durante o processo de deployment guiado, você será solicitado a configurar:

- **Stack Name**: Nome da stack CloudFormation (sugestão: "agent-cv-stack")
- **AWS Region**: Região da AWS para deploy (recomendado: us-east-2 para compatibilidade com Bedrock)
- **Permissões**: Confirme a criação de roles IAM necessárias

## Após o Deployment

Depois de implantada, a aplicação terá:

1. Um endpoint API Gateway que aceita requisições POST em `/analyze-cv`
2. Uma tabela DynamoDB chamada "JobsTable" para armazenar vagas
3. Uma função Lambda configurada com as permissões necessárias para acessar DynamoDB e AWS Bedrock

## Populando o DynamoDB com Vagas

Antes de utilizar a aplicação, você precisa adicionar vagas ao DynamoDB. Você pode fazer isso via:

```bash
# Exemplo de como adicionar uma vaga usando AWS CLI
aws dynamodb put-item \
  --table-name JobsTable \
  --item '{
    "id": {"S": "job123"},
    "title": {"S": "Engenheiro de Software"},
    "description": {"S": "Desenvolvimento de aplicações em Node.js e AWS"},
    "requirements": {"S": "AWS, Node.js, DynamoDB, Lambda, 3+ anos de experiência"},
    "company": {"S": "TechCorp"},
    "location": {"S": "São Paulo"}
  }'
```

## Utilizando a API

Para analisar um currículo contra as vagas disponíveis:

```bash
curl -X POST \
  https://[seu-api-id].execute-api.[região].amazonaws.com/Prod/analyze-cv \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "João Silva",
    "cv": "Sou um desenvolvedor com 5 anos de experiência em Node.js e AWS. Trabalhei em projetos utilizando Lambda, DynamoDB e outros serviços serverless."
  }'
```

A resposta incluirá uma análise detalhada da compatibilidade entre o candidato e as vagas disponíveis.

## Desenvolvimento Local

Para testar a função localmente:

```bash
# Executar a função localmente com um evento de teste
sam local invoke AgentCVFunction --event events/sample-event.json

# Iniciar a API localmente
sam local start-api
```

**Nota**: Para testes locais com AWS Bedrock, você precisará configurar credenciais AWS com permissões apropriadas.

## Monitoramento e Logs

Para visualizar logs da função Lambda:

```bash
sam logs -n AgentCVFunction --stack-name [nome-da-sua-stack] --tail
```

## Limpeza

Para remover todos os recursos criados:

```bash
sam delete --stack-name [nome-da-sua-stack]
```

## Recursos Adicionais

- [Documentação do AWS Bedrock](https://docs.aws.amazon.com/bedrock/)
- [Documentação do AWS Lambda](https://docs.aws.amazon.com/lambda/)
- [Documentação do Amazon DynamoDB](https://docs.aws.amazon.com/dynamodb/)
- [Guia do Desenvolvedor AWS SAM](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)
