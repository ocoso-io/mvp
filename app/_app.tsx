import type { AppProps } from 'next/app';
import { JSX } from 'react';
import React from 'react';
import './globals.css';

export default function App({ Component, pageProps }: AppProps): JSX.Element {
    return <Component {...pageProps} />;
}