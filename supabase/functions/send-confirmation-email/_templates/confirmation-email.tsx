import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Button,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface ConfirmationEmailProps {
  confirmationUrl: string;
  userEmail: string;
}

export const ConfirmationEmail = ({
  confirmationUrl,
  userEmail,
}: ConfirmationEmailProps) => (
  <Html>
    <Head />
    <Preview>Confirm your email address to complete registration</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to Union of Youth Federations!</Heading>
        <Text style={text}>
          Thank you for signing up. Please confirm your email address to complete your registration.
        </Text>
        
        <div style={buttonContainer}>
          <Button href={confirmationUrl} style={button}>
            Confirm Email Address
          </Button>
        </div>
        
        <Text style={text}>
          If the button doesn't work, you can also click this link:
        </Text>
        <Link href={confirmationUrl} style={link}>
          {confirmationUrl}
        </Link>
        
        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default ConfirmationEmail;

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '580px',
};

const h1 = {
  color: '#2563eb',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '12px 30px',
  display: 'inline-block',
};

const link = {
  color: '#2563eb',
  fontSize: '14px',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
};

const footer = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '24px',
  marginTop: '32px',
  textAlign: 'center' as const,
};