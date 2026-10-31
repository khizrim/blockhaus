import { useState } from 'react';

import { Xmark } from '@gravity-ui/icons';
import { Card, Icon, Text } from '@gravity-ui/uikit';

import { Button } from 'src/components/atoms/Button';
import { Container } from 'src/components/atoms/Container';

import { Form } from 'src/components/molecules/Form';

import type { TopicProps } from 'src/components/molecules/TopicCard';

import { inputs } from './TopicForm.constants';

interface TopicFormProps {
  onSubmit: (formData: TopicProps) => Promise<void>;
}

export const TopicForm = ({ onSubmit }: TopicFormProps) => {
  const [isFormShown, setIsFormShown] = useState(false);

  const toggleFormVisibility = () => {
    setIsFormShown(prev => !prev);
  };

  const handleSubmit = async (formData: TopicProps) => {
    await onSubmit(formData);
    toggleFormVisibility();
  };

  return (
    <Card spacing={{ p: 4 }} view='clear'>
      <Container direction='column' gap={2}>
        <Container alignItems='center' justifyContent='space-between' minHeight='80px'>
          <Text variant='header-1'>Create a new topic</Text>
          {isFormShown ? (
            <Button size='s' view='flat' onClick={toggleFormVisibility}>
              <Icon data={Xmark} />
            </Button>
          ) : (
            <Button view='action' width='auto' onClick={toggleFormVisibility}>
              Create
            </Button>
          )}
        </Container>
        {isFormShown && <Form inputs={inputs} onSubmit={handleSubmit}></Form>}
      </Container>
    </Card>
  );
};
