import React, { useEffect, useState } from 'react';

import { Link, Skeleton, Text } from '@gravity-ui/uikit';

export const Geolocation = () => {
  const [status, setStatus] = useState<string | null>(null);
  const [mapLink, setMapLink] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const geoFindMe = () => {
    setStatus('Searching for location...');
    setIsLoading(true);

    if (!navigator.geolocation) {
      setStatus('Location is not supported');
      setIsLoading(false);
      return;
    }

    const success = async (position: GeolocationPosition) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      try {
        const response = await fetch(
          `https://geocode-maps.yandex.ru/1.x/?format=json&geocode=${longitude},${latitude}&apikey=d7fd5843-8814-47ac-a3a2-cb45b30293fb`
        );
        const data = await response.json();
        const address =
          data.response.GeoObjectCollection.featureMember[0].GeoObject.metaDataProperty.GeocoderMetaData.text;

        setStatus(null);
        setAddress(address);
        setMapLink(`https://yandex.ru/maps/?ll=${longitude}%2C${latitude}&z=18&l=map`);
      } catch (error) {
        setStatus('An error occurred while fetching location');
      } finally {
        setIsLoading(false);
      }
    };

    const error = () => {
      setStatus('An error occurred while fetching location');
      setIsLoading(false);
    };

    navigator.geolocation.getCurrentPosition(success, error);
  };

  useEffect(() => {
    geoFindMe();
  }, []);

  return (
    <>
      {isLoading ? (
        <Skeleton style={{ height: '50px', width: '200px' }} />
      ) : (
        <Text variant='body-short' color='info'>
          {status}
        </Text>
      )}
      {mapLink && address && (
        <Link href={mapLink} target='_blank' rel='noopener noreferrer' view='secondary'>
          <Text ellipsis ellipsisLines={1}>
            {address}
          </Text>
        </Link>
      )}
    </>
  );
};
