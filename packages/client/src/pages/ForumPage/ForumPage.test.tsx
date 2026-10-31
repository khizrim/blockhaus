import React from 'react';

import { render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

import { PAGE_ROUTES } from 'src/utils/constants';

import { ForumPage, topicsLoader } from './ForumPage';

test('renders topics correctly', async () => {
  const routes = [
    {
      path: PAGE_ROUTES.FORUM,
      element: <ForumPage />,
      loader: topicsLoader,
    },
  ];

  const router = createMemoryRouter(routes, {
    initialEntries: [PAGE_ROUTES.FORUM],
  });

  render(<RouterProvider router={router} />);

  await waitFor(() => {
    const generalDiscussion = screen.getByText('General Discussion');
    expect(generalDiscussion).toBeInTheDocument();

    const announcements = screen.getByText('Announcements');
    expect(announcements).toBeInTheDocument();

    const offTopic = screen.getByText('Off-Topic');
    expect(offTopic).toBeInTheDocument();

    const feedback = screen.getByText('Feedback & Suggestions');
    expect(feedback).toBeInTheDocument();

    const technicalSupport = screen.getByText('Technical Support');
    expect(technicalSupport).toBeInTheDocument();
  });
});
