import React from 'react'
import { connect } from 'react-redux'
import { Link } from 'react-router-dom'

import env from '../helpers/env'

import styles from './header.module.scss'

// Gestionnaire d'état (quel user est enregistré, enregistré ou non, etc.)
const mapStateToProps = ({ logedIn, activeUser }) => {
  return { logedIn, activeUser }
}

const ConnectedHeader = (props) => {
  const nav = props.logedIn ? (
    <>
      <Link to="/credentials">{props.activeUser.displayName}</Link>
      <Link to="/books">Books</Link>
      <Link to="/articles">Articles</Link>
      <a
        href={env.BACKEND_ENDPOINT + '/logout'}
        className={styles.logoutAction}
      >
        Log out
      </a>
    </>
  ) : (
    <>
      <Link to="/">Login</Link>
      <Link to="/register" className={styles.registerAction}>
        Register
      </Link>
    </>
  )

  return (
    <header className={props.className}>
      <section className={styles.header}>
        <h1 className={styles.logo}>
          <Link to="/">_Stylo_</Link>
        </h1>
        <nav>
          {nav}
          <a
            href="http://stylo-doc.ecrituresnumeriques.ca"
            className={styles.documentationLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </nav>
      </section>
    </header>
  )
}

const Header = connect(mapStateToProps)(ConnectedHeader)
export default Header