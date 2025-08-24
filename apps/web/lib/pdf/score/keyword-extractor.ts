import { createLogger } from '@/lib/logger';
import stopwords from 'stopwords-iso';

const logger = createLogger('keyword-extractor');

// English stopwords
const englishStopwords = new Set(stopwords.en);

// Additional stopwords specific to job descriptions and resumes
const additionalStopwords = new Set([
  // Common filler words
  'able', 'about', 'above', 'across', 'actually', 'after', 'afterwards', 'again', 'against',
  'all', 'almost', 'alone', 'along', 'already', 'also', 'although', 'always', 'among',
  'amongst', 'amount', 'an', 'and', 'another', 'any', 'anyhow', 'anyone', 'anything',
  'anyway', 'anywhere', 'are', 'around', 'as', 'at', 'back', 'be', 'became', 'because',
  'become', 'becomes', 'becoming', 'been', 'before', 'beforehand', 'behind', 'being',
  'below', 'beside', 'besides', 'between', 'beyond', 'both', 'bottom', 'but', 'by',
  'call', 'can', 'cannot', 'cant', 'co', 'con', 'could', 'couldnt', 'cry', 'de',
  'describe', 'detail', 'do', 'done', 'down', 'due', 'during', 'each', 'eg', 'eight',
  'either', 'eleven', 'else', 'elsewhere', 'empty', 'enough', 'etc', 'even', 'ever',
  'every', 'everyone', 'everything', 'everywhere', 'except', 'few', 'fifteen', 'fifty',
  'fill', 'find', 'fire', 'first', 'five', 'for', 'former', 'formerly', 'forty', 'found',
  'four', 'from', 'front', 'full', 'further', 'get', 'give', 'go', 'had', 'has', 'hasnt',
  'have', 'he', 'hence', 'her', 'here', 'hereafter', 'hereby', 'herein', 'hereupon',
  'hers', 'herself', 'him', 'himself', 'his', 'how', 'however', 'hundred', 'i', 'ie',
  'if', 'in', 'inc', 'indeed', 'interest', 'into', 'is', 'it', 'its', 'itself', 'keep',
  'last', 'latter', 'latterly', 'least', 'less', 'ltd', 'made', 'many', 'may', 'me',
  'meanwhile', 'might', 'mill', 'mine', 'more', 'moreover', 'most', 'mostly', 'move',
  'much', 'must', 'my', 'myself', 'name', 'namely', 'neither', 'never', 'nevertheless',
  'next', 'nine', 'no', 'nobody', 'none', 'noone', 'nor', 'not', 'nothing', 'now',
  'nowhere', 'of', 'off', 'often', 'on', 'once', 'one', 'only', 'onto', 'or', 'other',
  'others', 'otherwise', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'part', 'per',
  'perhaps', 'please', 'put', 'rather', 're', 'same', 'see', 'seem', 'seemed', 'seeming',
  'seems', 'serious', 'several', 'she', 'should', 'show', 'side', 'since', 'sincere',
  'six', 'sixty', 'so', 'some', 'somehow', 'someone', 'something', 'sometime', 'sometimes',
  'somewhere', 'still', 'such', 'system', 'take', 'ten', 'than', 'that', 'the', 'their',
  'them', 'themselves', 'then', 'thence', 'there', 'thereafter', 'thereby', 'therefore',
  'therein', 'thereupon', 'these', 'they', 'thick', 'thin', 'third', 'this', 'those',
  'though', 'three', 'through', 'throughout', 'thru', 'thus', 'to', 'together', 'too',
  'top', 'toward', 'towards', 'twelve', 'twenty', 'two', 'un', 'under', 'until', 'up',
  'upon', 'us', 'very', 'via', 'was', 'we', 'well', 'were', 'what', 'whatever', 'when',
  'whence', 'whenever', 'where', 'whereafter', 'whereas', 'whereby', 'wherein', 'whereupon',
  'wherever', 'whether', 'which', 'while', 'whither', 'who', 'whoever', 'whole', 'whom',
  'whose', 'why', 'will', 'with', 'within', 'without', 'would', 'yet', 'you', 'your',
  'yours', 'yourself', 'yourselves',
  
  // Job description specific
  'job', 'description', 'responsibilities', 'requirements', 'qualifications', 'position',
  'role', 'company', 'employer', 'candidate', 'applicant', 'opportunity', 'career',
  'salary', 'benefits', 'apply', 'application', 'resume', 'cv', 'cover', 'letter',
  'interview', 'hiring', 'recruitment', 'recruiter', 'hr', 'human', 'resources',
  
  // Time-related
  'year', 'years', 'month', 'months', 'week', 'weeks', 'day', 'days', 'hour', 'hours',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september',
  'october', 'november', 'december', 'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug',
  'sep', 'oct', 'nov', 'dec', 'today', 'tomorrow', 'yesterday', 'date', 'deadline',
  
  // Numbers and units
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'hundred', 'thousand', 'million', 'billion', 'percent', 'percentage',
]);

// Combine all stopwords
const allStopwords = new Set([...englishStopwords, ...additionalStopwords]);

/**
 * Extracts keywords from text
 */
export function extractKeywords(text: string): string[] {
  logger.info('Extracting keywords from text', { textLength: text.length });
  
  try {
    // Normalize text
    const normalizedText = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .replace(/\s+/g, ' ')     // Replace multiple spaces with a single space
      .trim();
    
    // Tokenize
    const tokens = normalizedText.split(' ');
    
    // Filter out stopwords, numbers, and short words
    const filteredTokens = tokens.filter(token => 
      token.length > 2 &&                  // Longer than 2 characters
      !allStopwords.has(token) &&          // Not a stopword
      !/^\d+$/.test(token) &&              // Not just a number
      !/^[a-z]$/.test(token)               // Not just a single letter
    );
    
    // Extract n-grams (1-3 words)
    const ngrams = extractNgrams(filteredTokens, 3);
    
    // Count occurrences
    const keywordCounts = new Map<string, number>();
    
    for (const ngram of ngrams) {
      keywordCounts.set(ngram, (keywordCounts.get(ngram) || 0) + 1);
    }
    
    // Sort by frequency
    const sortedKeywords = Array.from(keywordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([keyword]) => keyword);
    
    logger.info('Keywords extracted', { keywordCount: sortedKeywords.length });
    
    return sortedKeywords;
  } catch (error) {
    logger.error('Error extracting keywords', { error });
    return [];
  }
}

/**
 * Extracts n-grams from a list of tokens
 */
function extractNgrams(tokens: string[], maxN: number): string[] {
  const ngrams: string[] = [];
  
  // Add single tokens (unigrams)
  ngrams.push(...tokens);
  
  // Add bigrams and trigrams
  for (let n = 2; n <= maxN; n++) {
    for (let i = 0; i <= tokens.length - n; i++) {
      const ngram = tokens.slice(i, i + n).join(' ');
      ngrams.push(ngram);
    }
  }
  
  return ngrams;
}

/**
 * Expands keywords with common synonyms
 */
export function expandWithSynonyms(keywords: string[]): string[] {
  const expanded = new Set<string>(keywords);
  
  // Common tech synonym mappings
  const synonymMap: Record<string, string[]> = {
    'javascript': ['js', 'ecmascript', 'es6', 'es2015', 'es2016', 'es2017', 'es2018', 'es2019', 'es2020'],
    'typescript': ['ts'],
    'react': ['reactjs', 'react.js'],
    'angular': ['angularjs', 'angular.js', 'ng'],
    'vue': ['vuejs', 'vue.js'],
    'node': ['nodejs', 'node.js'],
    'express': ['expressjs', 'express.js'],
    'mongodb': ['mongo'],
    'postgresql': ['postgres', 'psql'],
    'mysql': ['mariadb'],
    'aws': ['amazon web services', 'amazon cloud'],
    'azure': ['microsoft azure', 'microsoft cloud'],
    'gcp': ['google cloud', 'google cloud platform'],
    'docker': ['containerization', 'containers'],
    'kubernetes': ['k8s', 'container orchestration'],
    'ci/cd': ['continuous integration', 'continuous deployment', 'continuous delivery', 'devops pipeline'],
    'machine learning': ['ml', 'artificial intelligence', 'ai'],
    'data science': ['data analysis', 'data analytics', 'big data'],
    'frontend': ['front-end', 'front end', 'client-side', 'client side'],
    'backend': ['back-end', 'back end', 'server-side', 'server side'],
    'fullstack': ['full-stack', 'full stack', 'end-to-end', 'end to end'],
    'ui': ['user interface', 'frontend', 'front-end'],
    'ux': ['user experience', 'user research', 'usability'],
    'api': ['rest api', 'restful api', 'graphql', 'web service', 'microservice'],
    'testing': ['unit testing', 'integration testing', 'e2e testing', 'test automation'],
    'agile': ['scrum', 'kanban', 'sprint', 'jira'],
    'devops': ['devsecops', 'ci/cd', 'infrastructure as code', 'iac'],
    'cloud': ['aws', 'azure', 'gcp', 'cloud computing', 'saas', 'paas', 'iaas'],
    'mobile': ['ios', 'android', 'react native', 'flutter', 'mobile development'],
    'security': ['cybersecurity', 'infosec', 'information security', 'appsec'],
    'blockchain': ['crypto', 'cryptocurrency', 'web3', 'smart contracts'],
    'data': ['database', 'sql', 'nosql', 'data warehouse', 'data lake'],
    'analytics': ['business intelligence', 'bi', 'data visualization', 'reporting'],
    'automation': ['rpa', 'robotic process automation', 'workflow automation'],
    'architecture': ['system design', 'software architecture', 'solution architecture'],
  };
  
  // Add synonyms for each keyword
  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();
    
    // Check if this keyword is a key in the synonym map
    if (synonymMap[lowerKeyword]) {
      for (const synonym of synonymMap[lowerKeyword]) {
        expanded.add(synonym);
      }
    }
    
    // Check if this keyword is a synonym in the map
    for (const [key, synonyms] of Object.entries(synonymMap)) {
      if (synonyms.includes(lowerKeyword)) {
        expanded.add(key);
        // Add other synonyms of the same key
        for (const synonym of synonyms) {
          expanded.add(synonym);
        }
      }
    }
  }
  
  return Array.from(expanded);
}