import React, { useState, useCallback } from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import formStyles from './field.module.scss'

import Button from './Button'
import Field from './Field'

import AcquintanceService from '../services/AcquintanceService'

export default function ConnectedAcquintances ({ onAdd }) {
  const [contact, setContact] = useState('')
  const userId = useSelector(state => state.activeUser._id)
  const applicationConfig = useSelector(state => state.applicationConfig)
  const acquintanceService = new AcquintanceService(userId, applicationConfig, shallowEqual)

  const addContact = useCallback(async (event) => {
    event.preventDefault()

    await acquintanceService.addAcquintance(contact)
    setContact('')

    const data = await acquintanceService.getAcquintances()
    onAdd(data.user.acquintances)
  }, [contact])

  return (<form onSubmit={addContact} className={formStyles.inlineFields}>
    <Field
      autoFocus={true}
      className={formStyles.fullWidth}
      placeholder='Email of the contact you want to add'
      value={contact}
      onChange={(e) => setContact(e.target.value)}
    />

    <Button type="submit">Add</Button>
  </form>)
}
