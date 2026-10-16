const query = `
  query getQuestionDetail($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      content
      exampleTestcases
      metaData
    }
  }
`;

fetch('https://leetcode.com/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, variables: { titleSlug: 'two-sum' } })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d.data.question))).catch(e => console.error(e));
