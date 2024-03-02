import express, { Request, Response } from 'express';
import * as dotevnv from 'dotenv';
import axios from 'axios';

dotevnv.config();

const app = express();
const port = process.env.PORT || 3000;

type FilterClauseType = {
  id: string;
  condition: 'equals' | 'does_not_equal' | 'greater_than' | 'less_than';
  value: number | string;
};

interface ResponseType {
  questions: Question[];
  submissionId: string;
  submissionTime: string;
}

interface Question {
  id: string;
  name: string;
  type: string;
  value: string | number;
}

type ResponseFiltersType = FilterClauseType[];

app.get('/:formId/filteredResponses', async (req: Request, res: Response) => {
  const formId: string = req.params.formId;
  const {
    limit = 150,
    afterDate,
    beforeDate,
    offset = 0,
    status,
    includeEditLink,
    sort,
  } = req.query;

  const filters: ResponseFiltersType | null = req.query.filters
    ? JSON.parse(req.query.filters as string)
    : null;

  const apiUrl = `https://api.fillout.com/v1/api/forms/${formId}/submissions`;
  let myOffset: number = Number(offset);
  let hasMore: boolean = true;
  let allResponses: any[] = [];

  while (hasMore) {
    try {
      const response = await axios.get(apiUrl, {
        // Include the API key in the request headers if required
        headers: { Authorization: `Bearer ${process.env.FILLOUT_API_KEY}` },
        params: {
          limit: Number(limit),
          afterDate,
          beforeDate,
          offset: myOffset,
          status,
          includeEditLink,
          sort,
        },
      });

      allResponses = [...allResponses, ...response.data.responses];

      // Check if there are more pages
      hasMore = response.data.totalResponses > allResponses.length;
      myOffset += Number(limit); // Prepare 'offset' for the next page
    } catch (error) {
      console.error('Error fetching submissions:', error);
      hasMore = false; // Stop loop if there is an error
    }
  }

  let filteredResponses = allResponses;

  // Apply filters
  if (filters) {
    filteredResponses = applyFilters(filteredResponses, filters);
  }

  const filtedLimit = parseInt(req.query.limit as string, 10) || 150;
  const totalResponses = filteredResponses.length;
  const pageCount = Math.ceil(totalResponses / filtedLimit);

  res.json({
    responses: filteredResponses,
    totalResponses: totalResponses,
    pageCount: pageCount,
  });
});

function applyFilters(responses: any[], filters: ResponseFiltersType): any[] {
  return responses.filter((response) => {
    return filters.every((filter) => {
      const question = response.questions.find(
        (q: Question) => q.id === filter.id
      );
      if (!question) return false;

      switch (filter.condition) {
        case 'equals':
          return question.value === filter.value;
        case 'does_not_equal':
          return question.value !== filter.value;
        case 'greater_than':
          // Assuming that strings are ISO date strings
          if (
            typeof question.value === 'number' &&
            typeof filter.value === 'number'
          ) {
            return question.value > filter.value;
          } else if (
            typeof question.value === 'string' &&
            typeof filter.value === 'string'
          ) {
            return new Date(question.value) > new Date(filter.value);
          }
          return false;
        case 'less_than':
          // Assuming that strings are ISO date strings
          if (
            typeof question.value === 'number' &&
            typeof filter.value === 'number'
          ) {
            return question.value < filter.value;
          } else if (
            typeof question.value === 'string' &&
            typeof filter.value === 'string'
          ) {
            return new Date(question.value) < new Date(filter.value);
          }
          return false;
        default:
          return false;
      }
    });
  });
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
