import React, {useState} from 'react'
import { ScrollView, TouchableOpacity, Text, TextInput, View } from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import { Dropdown } from 'react-native-element-dropdown';


const countries = require("../../components/Countries.json")
let countrArray = []

export default function CountrySelection({route, navigation})
{
    const [value, setValue] = useState("")
    countries.forEach((country) => {
        countrArray.push({label:country.name, value:country.id})
    })
    return(
        <ScrollView style={{width:"100%", height:"95%", marginTop:"15%"}}>
            <TouchableOpacity>
            <Feather name="x" size={28} color="black"/>
            </TouchableOpacity>
            <Text style={{textAlign:"center", paddingTop:"5%", paddingBottom:"10%", fontWeight:"bold", fontSize:30}}>
                Tell us where it's from
            </Text>
            <Dropdown activeColor='#addfad' style={{marginLeft:"7%", marginRight:"7%"}} search searchPlaceholder='Search for country...' placeholder='Select Country' data={countrArray} labelField='label' valueField='value' onChange={item => {
                setValue(item.value);
            }} value={value}/>
            <View style={{flexDirection:"row", marginTop:"25%", alignSelf:"center"}}>
                <TouchableOpacity style={{ backgroundColor:"#addfad", width:"25%", borderRadius:7,  alignSelf:"center"}}>
                    <Ionicons name="arrow-back" size={34} color="white" style={{textAlign:"center"}} />
                </TouchableOpacity>
                <TouchableOpacity style={{backgroundColor:"#addfad",  width:"25%", borderRadius:7, marginLeft:"10%", alignSelf:"center"}}>
                    <Ionicons name="arrow-forward" size={34} color="white" style={{textAlign:"center"}} />
                </TouchableOpacity>
            </View>
        </ScrollView>
    )
}