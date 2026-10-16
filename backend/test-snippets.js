const query = `
  query getQuestionDetail($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      exampleTestcases
    }
  }
`;

fetch('https://leetcode.com/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, variables: { titleSlug: 'string-compression' } })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d.data.question.exampleTestcases))).catch(e => console.error(e));
