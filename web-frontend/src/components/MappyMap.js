import SelectInput from '@mui/material/Select/SelectInput';
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup} from 'react-leaflet'
import countryPosition from "../data/CountriesUpdated.json"
import Sidebar from './Sidebar';
import RecipeReviewCard from './SideBar/Menu/ProfileRecipesMap';


function importAll(r) {
  let images = {};
  r.keys().map(item => { images[item.replace('./', '')] = r(item); });
  return images;
}


const images = importAll(require.context('../assets/images/flagpng', false, /\.(png|jpe?g|svg)$/));

const app_name = 'reci-pin';
function buildPath(route)
{
  if (process.env.NODE_ENV === 'production')
      return 'https://' + app_name + '.herokuapp.com/' + route;
  else
      return 'http://localhost:5000/' + route;
}


const MappyMap = () =>
{
  const [markerList, setMarkerList] = useState([]);

  const [favList, setFavList] = useState([]);
  const [likedList, setLikedList] = useState([]);

  const lower = countryPosition.id;

  const getLikes = async () =>
  {
      let jsonPayLoad = JSON.stringify({
          userID: JSON.parse(window.localStorage.getItem('userObject'))['_id'],
      });

      try 
      {
          // returns liked, favorited
          const response = await fetch(buildPath("api/getLikes"), {
              method: "POST",
              body: jsonPayLoad,
              headers: { "Content-Type": "application/json","x-access-token": JSON.parse(window.localStorage.getItem('userObject'))['token'] }
            });

          let res = JSON.parse(await response.text());

         let hashy = new Map();


          for (let i = 0; i < res.length; i++)
          {
            hashy.set(res[i]['_id'], res)
          }
      
          setLikedList(hashy)
              



      }
      catch(e)
      {
          console.log(e)
      }
  };

  const getFavs = async () =>
  {
      let jsonPayLoad = JSON.stringify({
          userID: JSON.parse(window.localStorage.getItem('userObject'))['_id'],
      });

      try 
      {
          // returns liked, favorited
          const response = await fetch(buildPath("api/getFavorites"), {
              method: "POST",
              body: jsonPayLoad,
              headers: { "Content-Type": "application/json","x-access-token": JSON.parse(window.localStorage.getItem('userObject'))['token'] }
            });

          let res = JSON.parse(await response.text());


         let hashy = new Map();


          for (let i = 0; i < res.length; i++)
          {
            hashy.set(res[i]['_id'], res)
          }
      
          setFavList(hashy)


      }
      catch(e)
      {
          console.log(e)
      }
  };

  const getRecipesInView = async (center ,distances) =>
  {

      let jsonPayLoad = JSON.stringify({
            location: center,
            distance: distances
      });

      try 
      {
          // returns liked, favorited
          const response = await fetch(buildPath("api/getNearbyRecipes"), {
              method: "POST",
              body: jsonPayLoad,
              headers: { "Content-Type": "application/json","x-access-token": JSON.parse(window.localStorage.getItem('userObject'))['token'] }
            });

          let res = JSON.parse(await response.text());

          console.log(res);


        await new Promise(resolve => setTimeout(resolve,500));
      
        setMarkerList(res);
              



      }
      catch(e)
      {
          console.log(e)
      }
  };

  useEffect(() => {getRecipesInView([50.8333, 4], 900.3);}, []);
  useEffect(() => {getLikes();}, []);
  useEffect(() => {getFavs();}, []);

  

  function createMarker(recipe)
  {
      let x = recipe['location']['coordinates'][1]
      let y = recipe['location']['coordinates'][0]
    return(<Marker
        key={recipe['_id']}
        position={[x, y]}
      >
        <Popup position={[x, y]}>
          <div>
            <h2>

              < RecipeReviewCard 
              key = {recipe['_id']}
              recipe = {recipe} 
              like= {likedList.get(recipe['_id']) != undefined? true: false} 
              fav = {favList.get(recipe['_id']) != undefined? true: false}
              likeMethod = {setLikedList}
              favMethod = {setFavList} />

            </h2>
          </div>
        </Popup>
      </Marker>);
  }

  const flags = lower + '.png'

  
        // {countryPosition.map((countryYoink) => (
        //   <Marker
        //     key={countryYoink.id}
        //     position={[countryYoink.latitude, countryYoink.longitude]}
        //   >
        //     <Popup position={[countryYoink.latitude, countryYoink.longitude]}>
        //       <div>
        //         <h2>
        //           {/* <img src={images[flags]} />

        //           <img src= {images[countryYoink.id.toLowerCase() + '.png']} /> */}

        //           < RecipeReviewCard / >

        //         </h2>
        //       </div>
        //     </Popup>
        //   </Marker>
        // ))}



  
    return (


      <MapContainer center={[50.8333, 4]} zoom={6} minZoom={3} >

        < Sidebar createMarker= {createMarker} setMarkerList = {setMarkerList} />


        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
    
        {markerList.map(createMarker)}
      </MapContainer>
    );
};

export default MappyMap;