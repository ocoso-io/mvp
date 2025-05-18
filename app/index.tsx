import Head from 'next/head';
import React from 'react';
import { JSX } from 'react';

export default function Home(): JSX.Element {
    return (
        <>
            <Head>
                <title>Mein Next.js Projekt</title>
                <meta name="description" content="Mit Next.js erstellte Anwendung" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main>
                <h1>Willkommen bei meiner Next.js Anwendung</h1>
                <p>Dies ist die Startseite der Next.js-Integration.</p>
            </main>
        </>
    );
}
