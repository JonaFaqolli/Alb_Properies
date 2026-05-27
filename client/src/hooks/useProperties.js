import { useState, useEffect } from 'react';
import { getProperties } from '../services/api';

export function useProperties() {
  const [properties, setProperties] = useState(null);

  useEffect(() => {
    getProperties()
      .then(({ data }) => setProperties(data))
      .catch(() => setProperties(null));
  }, []);

  return { properties };
}
