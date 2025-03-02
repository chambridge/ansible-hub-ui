import { t } from '@lingui/macro';
import * as React from 'react';
import {
  Button,
  Form,
  FormGroup,
  Modal,
  ModalVariant,
  TextInput,
} from '@patternfly/react-core';
import { ErrorMessagesType } from 'src/utilities';

interface IProps {
  onCancel?: () => void;
  onSave?: (string) => void;
  clearErrors?: () => void;
  group?: { name: string };
  errorMessage?: ErrorMessagesType;
}

interface IState {
  name: string;
}

export class GroupModal extends React.Component<IProps, IState> {
  constructor(props) {
    super(props);
    this.state = {
      name:
        !this.props.group || !this.props.group.name
          ? ''
          : this.props.group.name,
    };
  }

  render() {
    const { onCancel, onSave, clearErrors } = this.props;
    return (
      <Modal
        variant={ModalVariant.medium}
        onClose={() => {
          onCancel();
        }}
        isOpen={true}
        title={t`Create a group`}
        actions={[
          <Button
            isDisabled={
              this.state.name.length === 0 ||
              (this.props.group && this.state.name === this.props.group.name)
            }
            key='create'
            variant='primary'
            onClick={() => onSave(this.state.name)}
          >
            {!this.props.group ? t`Create` : t`Save`}
          </Button>,
          <Button key='cancel' variant='link' onClick={() => onCancel()}>
            {t`Cancel`}
          </Button>,
        ]}
      >
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(this.state.name);
          }}
        >
          <FormGroup
            isRequired={true}
            key='name'
            fieldId='name'
            label={t`Name`}
            helperTextInvalid={
              !this.props.errorMessage ? null : this.props.errorMessage.name
            }
            validated={this.toError(!this.props.errorMessage)}
          >
            <TextInput
              id='group_name'
              value={this.state.name}
              onChange={(value) => {
                this.setState({ name: value });
                clearErrors();
              }}
              type='text'
              validated={this.toError(!this.props.errorMessage)}
            />
          </FormGroup>
        </Form>
      </Modal>
    );
  }

  private toError(validated: boolean) {
    return validated ? 'default' : 'error';
  }
}
