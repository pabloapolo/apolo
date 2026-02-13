# IPTV Web Player (HTML/CSS/JS)

Player web simples para abrir listas IPTV no navegador usando **URL + usuário + senha** (padrão Xtream Codes API), sem app nativo.

## Como usar

1. Baixe os arquivos.
2. Abra `index.html` no navegador **ou** sirva a pasta com um servidor local simples.
3. Preencha:
   - URL do servidor (ex: `http://provedor.com:8080`)
   - Usuário
   - Senha
4. Clique em **Carregar canais**.
5. Selecione um canal na lista para assistir.

## Observações importantes

- Muitos provedores IPTV bloqueiam requisições de navegador por **CORS**.
- Quando isso acontecer, use o campo **Proxy CORS** (exemplo: `https://proxy.exemplo/?url=`).
- O formato recomendado é **m3u8** (HLS). Em alguns casos `ts` pode funcionar melhor.

## Rodando localmente (opcional)

Você pode rodar com qualquer servidor estático local. Exemplo:

```bash
python3 -m http.server 8080
```

Depois abra `http://localhost:8080`.
