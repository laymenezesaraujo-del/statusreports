# Status Report Generator

Sistema web para geração automática de status reports a partir de transcrições de reuniões.

## Como subir no Vercel

### 1. Suba o projeto no GitHub
```bash
git init
git add .
git commit -m "status report app"
gh repo create status-report-app --public --push
```

Ou crie um repositório manualmente em github.com e faça o push.

### 2. Deploy no Vercel
1. Acesse vercel.com e faça login com sua conta GitHub
2. Clique em "Add New Project"
3. Selecione o repositório `status-report-app`
4. Clique em "Deploy" — sem nenhuma configuração adicional

Pronto! Você terá uma URL pública tipo `https://status-report-app.vercel.app`

---

## Configure o Supabase (banco de dados gratuito)

### 1. Crie o projeto
1. Acesse supabase.com e crie uma conta
2. Clique em "New project"
3. Dê um nome e escolha a região (South America se disponível)

### 2. Crie a tabela
No painel do Supabase, vá em **SQL Editor** e execute:

```sql
CREATE TABLE transcriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project text NOT NULL,
  meeting_date date NOT NULL,
  context text,
  filename text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON transcriptions FOR ALL USING (true);
```

### 3. Pegue as credenciais
Em **Settings → API**:
- Copie a **Project URL**
- Copie a **anon public key**

---

## Configure o sistema

Na primeira vez que acessar o sistema, vá em **Configurações** e preencha:
- **Chave da API Anthropic** — obtenha em console.anthropic.com
- **URL do Supabase** — ex: https://xxxx.supabase.co
- **Chave anon do Supabase** — começa com eyJ...

---

## Como usar

### Upload de transcrições (ao longo da semana)
1. Clique em **Upload**
2. Arraste ou selecione o PDF do Tactique
3. Selecione o projeto e a data da reunião
4. Clique em **Fazer upload**

### Gerar os status reports (toda terça-feira)
1. Clique em **Gerar Relatório**
2. Confirme o período (preenchido automaticamente com a semana atual)
3. Selecione os projetos desejados
4. Clique em **Analisar transcrições e gerar relatórios**
5. Para cada projeto, alterne entre as abas **WhatsApp** e **E-mail**
6. Clique em **Copiar** e cole no canal desejado

---

## Tecnologias utilizadas
- Frontend: HTML/CSS/JS puro (sem framework)
- Hospedagem: Vercel (gratuito)
- Banco de dados: Supabase (gratuito)
- IA: Claude API (Anthropic)
