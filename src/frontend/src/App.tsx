import React, { useState } from 'react';
import { Layout, Input, Button, Switch, Form, Typography, message, Row, Col } from 'antd';
import { v4 as uuidv4 } from 'uuid';

const { Header, Footer, Content } = Layout;
const { Title, Text } = Typography;

interface Question {
  uuid: string;
  question: string;
  answer: boolean | null;
}

const initialQuestions: Question[] = Array.from({ length: 10 }).map((_, index) => ({
  uuid: uuidv4(),
  question: `Pergunta ${index + 1}`,
  answer: null,
}));

const App: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [questionsVisible, setQuestionsVisible] = useState<boolean>(false);
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(e.target.value);
  };

  const handlePhoneNumberSubmit = () => {
    if (/^\d{10,15}$/.test(phoneNumber)) {
      setQuestionsVisible(true);
    } else {
      message.warning('Por favor, insira um número de telefone válido (10-15 dígitos).');
    }
  };

  const handleResponseChange = (uuid: string, value: boolean) => {
    setQuestions(prevQuestions =>
      prevQuestions.map(q => (q.uuid === uuid ? { ...q, answer: value } : q))
    );
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    message.success('Obrigado por enviar suas respostas!');
  
    // Create the payload based on the current form data
    const requestBody = {
      tel_number: phoneNumber,
      qa_list: questions.map((question) => ({
        question: question.question,
        answer: question.answer,
      })),
    };
  
    try {
      // Send the POST request to /api/store_answers
      const response = await fetch('/api/store_answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
  
      if (response.ok) {
        // If the request was successful, log the response or handle further actions
        const data = await response.json();
        console.log('Response from server:', data);
      } else {
        // Handle server errors
        message.error('Ocorreu um erro ao enviar suas respostas. Tente novamente.');
      }
    } catch (error) {
      // Handle network errors
      console.error('Error sending request:', error);
      message.error('Erro de rede. Por favor, tente novamente mais tarde.');
    }
  
    // Log all form data
    console.log('Phone Number:', phoneNumber);
    console.log('Responses:', questions);
  };

  return (
    <Layout style={{ minHeight: '100vh', width: '100vw', backgroundColor: '#f0f2f5' }}>
      <Header style={{ color: 'white', textAlign: 'center', backgroundColor: '#004d40' }}>
        <Title level={3} style={{ color: 'white', margin: 0, display: 'inline' }}>Caçadores de infecção</Title>
      </Header>

      <Content style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 134px)' }}>
        {submitted ? (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <Title level={4}>Obrigado por suas respostas!</Title>
          </div>
        ) : (
          <>
            <Row justify="center" style={{ width: '100%' }}>
              <Col span={24} style={{ textAlign: 'center', marginBottom: '20px' }}>
                <img src="/buster.png" alt="Caçadores de infecção" style={{ width: '100px' }} />
              </Col>
              <Col span={24} style={{ textAlign: 'center' }}>
                <Form layout={questionsVisible ? "horizontal" : "vertical"}>
                  {!questionsVisible ? (
                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                      <Form.Item
                        label="Digite seu número de telefone para iniciar a pesquisa"
                        rules={[
                          { required: true, message: 'Por favor, insira seu número de telefone' },
                          { pattern: /^\d{10,15}$/, message: 'O número de telefone deve ter entre 10 e 15 dígitos' }
                        ]}
                      >
                        <Input
                          type="tel"
                          value={phoneNumber}
                          onChange={handlePhoneNumberChange}
                          placeholder="Número de telefone"
                        />
                      </Form.Item>
                      <Button type="primary" onClick={handlePhoneNumberSubmit}>
                        Iniciar Pesquisa
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Title level={4}>Responda às perguntas a seguir</Title>
                      <Row gutter={[16, 16]} justify="center" style={{ width: '100%' }}>
                        {questions.map((question) => (
                          <Col key={question.uuid} span={24} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
                            <Form.Item
                              label={question.question}
                            >
                              <Switch
                                checked={question.answer === true}
                                onChange={(value) => handleResponseChange(question.uuid, value)}
                                checkedChildren="Sim"
                                unCheckedChildren="Não"
                              />
                            </Form.Item>
                          </Col>
                        ))}
                      </Row>
                      <Button type="primary" onClick={handleSubmit} style={{ marginTop: '20px' }}>
                        Enviar
                      </Button>
                    </>
                  )}
                </Form>
              </Col>
            </Row>
          </>
        )}
      </Content>

      <Footer style={{ textAlign: 'center', backgroundColor: '#004d40', color: 'white' }}>
        <Text type="secondary" style={{ color: 'white' }}>Caçadores de infecção ©2023</Text>
      </Footer>
    </Layout>
  );
};

export default App;
