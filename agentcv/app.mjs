import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { unmarshall } from "@aws-sdk/util-dynamodb";

// Inicialização dos clientes AWS
const dynamoClient = new DynamoDBClient({ region: "us-east-2" });
const bedrockClient = new BedrockRuntimeClient({ region: "us-east-2" });

// Modelo Anthropic a ser utilizado
const MODEL_ID = "us.anthropic.claude-3-7-sonnet-20250219-v1:0";

export const lambdaHandler = async (event, context) => {
  try {
    console.log("Evento recebido:", JSON.stringify(event));

    // Responder a requisições CORS
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "CORS preflight response" }),
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      };
    }

    // Extrair informações do corpo da requisição
    const body = event.body ? JSON.parse(event.body) : {};
    const { cv, name } = body;

    if (!cv || !name) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Parâmetros 'cv' e 'name' são obrigatórios no corpo da requisição"
        })
      };
    }

    // Consultar vagas no DynamoDB
    const jobsData = await getAvailableJobs();

    // Preparar análise de compatibilidade usando AWS Bedrock
    const analysisResult = await analyzeJobMatch(cv, name, jobsData);

    // Retornar resultados
    return {
      statusCode: 200,
      body: JSON.stringify({
        candidateName: name,
        analysisResult
      }),
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Permitir CORS se necessário
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET", // Permitir métodos HTTP
        "Access-Control-Allow-Headers": "Content-Type" // Permitir cabeçalhos específicos
      }
    };

  } catch (error) {
    console.error("Erro ao processar requisição:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Erro ao processar a requisição",
        error: error.message
      }),
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Permitir CORS se necessário
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET", // Permitir métodos HTTP
        "Access-Control-Allow-Headers": "Content-Type" // Permitir cabeçalhos específicos
      }
    };
  }
};

/**
 * Função para buscar vagas disponíveis no DynamoDB
 */
async function getAvailableJobs() {
  const params = {
    TableName: process.env.JOBS_TABLE_NAME || "JobsTable",
  };

  try {
    const command = new ScanCommand(params);
    const result = await dynamoClient.send(command);

    // Converter os itens do formato DynamoDB para JSON padrão
    return result.Items.map(item => unmarshall(item));
  } catch (error) {
    console.error("Erro ao consultar DynamoDB:", error);
    throw error;
  }
}

/**
 * Função para analisar a compatibilidade entre CV e vagas usando AWS Bedrock
 */
async function analyzeJobMatch(cv, candidateName, jobs) {
  // Preparar prompt para o modelo
  const prompt = prepareAnthropicPrompt(cv, candidateName, jobs);

  // Configurações da chamada ao Bedrock
  const params = {
    modelId: MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    })
  };

  try {
    const command = new InvokeModelCommand(params);
    const response = await bedrockClient.send(command);

    // Processar resposta
    const responseBody = JSON.parse(Buffer.from(response.body).toString());
    return responseBody.content[0].text;
  } catch (error) {
    console.error("Erro ao chamar AWS Bedrock:", error);
    throw error;
  }
}

/**
 * Preparar o prompt para o modelo Anthropic
 */
function prepareAnthropicPrompt(cv, candidateName, jobs) {
  return `
    Você é um especialista em recrutamento e seleção. Sua tarefa é analisar a compatibilidade entre um candidato e várias vagas disponíveis do ramo da tecnologia.
    
    Por favor, analise a compatibilidade entre o candidato e as vagas disponíveis.

    ## Informações do Candidato
    Nome: ${candidateName}

    ## Currículo do Candidato
    ${cv}

    ## Vagas Disponíveis
    ${JSON.stringify(jobs, null, 2)}

    ## Instruções
    1. Analise as habilidades e experiência do candidato com base no currículo fornecido
    2. Compare com os requisitos e descrições das vagas disponíveis
    3. Identifique a vaga que possuir a maior compatibilidade com o candidato.
    
    ## Retorno das informações:
      - Justificativa de compatiblidade
      - Percentual de compatibilidade (0-100%) para a vaga com maior compatiblidade
      - Pontos fortes do candidato para a vaga com maior compatiblidade
      - Possíveis lacunas de habilidades ou experiência para a vaga com maior compatiblidade

    Formate sua resposta de forma estruturada e clara, em formato mardown com os tópicos citados acima.
`;
}
