import React from "react";
import {connect} from "react-redux";
import * as actionCreators from "./redux/action_creators.jsx";

import getMuiTheme from "material-ui/styles/getMuiTheme";
import MuiThemeProvider from "material-ui/styles/MuiThemeProvider";

import Header from "./Header.jsx";
import Body from "./BodyPGMLab.jsx";
import Footer from "./Footer.jsx";

import Dialog from "material-ui/Dialog";
import GoogleLogin from "react-google-login";

class AuthWrapper extends React.Component {
  constructor(props){
    super(props);
    this.getGoogleButton = this.getGoogleButton.bind(this);
  }
  getGoogleButton(){
    const responseGoogle =
      r => {
        console.log(r.getAuthResponse());
        if (r.isSignedIn()) {
          this.props.signIn(r)
        };
      };
    const clientId = this.props.auth.get("googleClientId");
    return (
      <GoogleLogin clientId={clientId} callback={responseGoogle} />
    );
  }
  render(){
    return (
      !this.props.auth.get("signedIn") ?
        <Dialog title="Sign in" actions={[this.getGoogleButton()]} modal={true} open={true} />
        :
        <div>
          <Header />
          <Body {...this.props} />
          <Footer />
        </div>
    );
  }
}

export class App extends  React.Component {
  constructor(props){
    super(props);
  }
  render(){
    return (
      <MuiThemeProvider muiTheme={getMuiTheme()}>
        <AuthWrapper {...this.props} />
      </MuiThemeProvider>
    );
  }
}

function mapStateToProps(state) {
  return {
    auth: state.get("auth"),
    session: state.get("session"),
    tasks: state.get("tasks"),
    showFaceted: state.get("showFaceted"),
    typeFilters: state.get("typeFilters"),
    statusFilters: state.get("statusFilters"),
    dateSort: state.get("dateSort"),
    idFilter: state.get("idFilter"),
    snackbarMessage: state.get("snackbarMessage")
  };
}

export const AppContainer = connect(mapStateToProps, actionCreators)(App)
