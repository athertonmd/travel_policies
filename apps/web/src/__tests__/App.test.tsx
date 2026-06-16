import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { App } from '../App';

function renderApp(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function loginAndNavigate(route: string) {
  renderApp(route);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'x' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
  await screen.findByRole('navigation');
}

describe('App routing and authentication', () => {
  it('should show login page when not authenticated', () => {
    renderApp();
    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('should show login form fields', () => {
    renderApp();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('should navigate to dashboard after login', async () => {
    await loginAndNavigate('/dashboard');
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });
});

describe('Navigation', () => {
  it('should render dashboard page', async () => {
    await loginAndNavigate('/dashboard');
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Total Documents')).toBeInTheDocument();
  });

  it('should render enterprises page', async () => {
    await loginAndNavigate('/enterprises');
    expect(screen.getByRole('heading', { name: 'Enterprises' })).toBeInTheDocument();
  });

  it('should render reviews page', async () => {
    await loginAndNavigate('/reviews');
    expect(screen.getByRole('heading', { name: 'Review Queue' })).toBeInTheDocument();
  });

  it('should render knowledge base page', async () => {
    await loginAndNavigate('/knowledge-base');
    expect(screen.getByRole('heading', { name: 'Knowledge Base' })).toBeInTheDocument();
  });

  it('should render admin page', async () => {
    await loginAndNavigate('/admin');
    expect(screen.getByRole('heading', { name: 'Administration' })).toBeInTheDocument();
  });

  it('should render review detail page', async () => {
    await loginAndNavigate('/reviews/rev-1');
    expect(screen.getByRole('heading', { name: 'Policy Review' })).toBeInTheDocument();
    expect(screen.getByText('Source Document')).toBeInTheDocument();
    expect(screen.getByText('Extracted Rule')).toBeInTheDocument();
  });

  it('should render policy comparison page', async () => {
    await loginAndNavigate('/policies/pol-1/comparison');
    expect(screen.getByRole('heading', { name: 'Policy Comparison' })).toBeInTheDocument();
  });

  it('should render published policy page', async () => {
    await loginAndNavigate('/policies/pol-1');
    expect(screen.getByRole('heading', { name: 'Published Policy' })).toBeInTheDocument();
  });

  it('should show navigation links', async () => {
    await loginAndNavigate('/dashboard');
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByText('TPIP')).toBeInTheDocument();
  });

  it('should show user info and logout', async () => {
    await loginAndNavigate('/dashboard');
    expect(screen.getByText('Logout')).toBeInTheDocument();
    expect(screen.getByText('SystemAdmin')).toBeInTheDocument();
  });
});

describe('Components', () => {
  it('should have accessible review actions', async () => {
    await loginAndNavigate('/reviews/rev-1');
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Modify' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
  });
});
