export const artwork = {
  rain: require('../../catalog/artwork/rain.jpg'),
  storm: require('../../catalog/artwork/storm.jpg'),
  ocean: require('../../catalog/artwork/ocean.jpg'),
  underwater: require('../../catalog/artwork/underwater.jpg'),
  forest: require('../../catalog/artwork/forest.jpg'),
  night: require('../../catalog/artwork/night.jpg'),
  river: require('../../catalog/artwork/river.jpg'),
  wind: require('../../catalog/artwork/wind.jpg'),
  birds: require('../../catalog/artwork/birds.jpg'),
  garden: require('../../catalog/artwork/garden.jpg'),
};

export function coverSource(name) {
  return artwork[name] || artwork.rain;
}
