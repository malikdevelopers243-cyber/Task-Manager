import { useEffect, useState } from 'react'

export const useAttendance = () => {
  const [attendance, setAttendance] = useState([])

  useEffect(() => {
    setAttendance([])
  }, [])

  return attendance
}
